# Copyright (c) 2015 Ansible, Inc.
# All Rights Reserved.

# Python
import getpass
import json
import os
import re
import time
import subprocess
import tempfile
import urlparse

# Django
from django.conf import settings
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test.utils import override_settings
from django.utils.timezone import now

# AWX
from awx.main.models import * # noqa
from awx.main.tests.base import BaseTransactionTest
from awx.main.tests.data.ssh import (
    #TEST_SSH_KEY_DATA,
    TEST_SSH_KEY_DATA_LOCKED,
    TEST_SSH_KEY_DATA_UNLOCK,
    #TEST_OPENSSH_KEY_DATA,
    #TEST_OPENSSH_KEY_DATA_LOCKED,
)
from awx.main.utils import decrypt_field, update_scm_url

TEST_PLAYBOOK = '''- hosts: mygroup
  gather_facts: false
  tasks:
  - name: woohoo
    command: test 1 = 1
'''


class ProjectsTest(BaseTransactionTest):

    # tests for users, projects, and teams

    def collection(self):
        return reverse('api:project_list')

    def setUp(self):
        super(ProjectsTest, self).setUp()
        self.setup_instances()
        self.setup_users()

        self.organizations = self.make_organizations(self.super_django_user, 10)
        self.projects      = self.make_projects(self.normal_django_user, 10, TEST_PLAYBOOK)

        # add projects to organizations in a more or less arbitrary way
        for project in self.projects[0:2]:
            self.organizations[0].projects.add(project)
        for project in self.projects[3:8]:
            self.organizations[1].projects.add(project)
        for project in self.projects[9:10]:
            self.organizations[2].projects.add(project)
        #self.organizations[0].projects.add(self.projects[-1])
        #self.organizations[9].projects.add(self.projects[-2])

        # get the URL for various organization records
        self.a_detail_url  = "%s%s" % (self.collection(), self.organizations[0].pk)
        self.b_detail_url  = "%s%s" % (self.collection(), self.organizations[1].pk)
        self.c_detail_url  = "%s%s" % (self.collection(), self.organizations[2].pk)

        # configuration:
        #   admin_user is an admin and regular user in all organizations
        #   other_user is all organizations
        #   normal_user is a user in organization 0, and an admin of organization 1

        for x in self.organizations:
            # NOTE: superuser does not have to be explicitly added to admin group
            # x.admins.add(self.super_django_user)
            x.member_role.members.add(self.super_django_user)

        self.organizations[0].member_role.members.add(self.normal_django_user)
        self.organizations[1].admin_role.members.add(self.normal_django_user)

        self.team1 = Team.objects.create(
            name = 'team1', organization = self.organizations[0]
        )

        self.team2 = Team.objects.create(
            name = 'team2', organization = self.organizations[0]
        )

        # create some teams in the first org
        #self.team1.projects.add(self.projects[0])
        self.projects[0].admin_role.parents.add(self.team1.member_role)
        #self.team1.projects.add(self.projects[0])
        self.team2.member_role.children.add(self.projects[1].admin_role)
        self.team2.member_role.children.add(self.projects[2].admin_role)
        self.team2.member_role.children.add(self.projects[3].admin_role)
        self.team2.member_role.children.add(self.projects[4].admin_role)
        self.team2.member_role.children.add(self.projects[5].admin_role)
        self.team1.save()
        self.team2.save()
        self.team1.member_role.members.add(self.normal_django_user)
        self.team2.member_role.members.add(self.other_django_user)

    def test_playbooks(self):
        def write_test_file(project, name, content):
            full_path = os.path.join(project.get_project_path(), name)
            if not os.path.exists(os.path.dirname(full_path)):
                os.makedirs(os.path.dirname(full_path))
            f = file(full_path, 'wb')
            f.write(content)
            f.close()
        # Invalid local_path
        project = self.projects[0]
        project.local_path = 'path_does_not_exist'
        project.save()
        self.assertFalse(project.get_project_path())
        self.assertEqual(len(project.playbooks), 0)
        # Simple playbook
        project = self.projects[1]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'foo.yml', TEST_PLAYBOOK)
        self.assertEqual(len(project.playbooks), 2)
        # Other files
        project = self.projects[2]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'foo.txt', 'not a playbook')
        self.assertEqual(len(project.playbooks), 1)
        # Empty playbook
        project = self.projects[3]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'blah.yml', '')
        self.assertEqual(len(project.playbooks), 1)
        # Invalid YAML (now allowed to show)
        project = self.projects[4]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'blah.yml', TEST_PLAYBOOK + '----')
        self.assertEqual(len(project.playbooks), 2)
        # No hosts or includes
        project = self.projects[5]
        self.assertEqual(len(project.playbooks), 1)
        playbook_content = TEST_PLAYBOOK.replace('hosts', 'hoists')
        write_test_file(project, 'blah.yml', playbook_content)
        self.assertEqual(len(project.playbooks), 1)
        # Playbook in roles folder
        project = self.projects[6]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'roles/blah.yml', TEST_PLAYBOOK)
        self.assertEqual(len(project.playbooks), 1)
        # Playbook in tasks folder
        project = self.projects[7]
        self.assertEqual(len(project.playbooks), 1)
        write_test_file(project, 'tasks/blah.yml', TEST_PLAYBOOK)
        self.assertEqual(len(project.playbooks), 1)

    def test_api_config(self):
        # superuser can read all config data.
        url = reverse('api:api_v1_config_view')
        response = self.get(url, expect=200, auth=self.get_super_credentials())
        self.assertTrue('project_base_dir' in response)
        self.assertEqual(response['project_base_dir'], settings.PROJECTS_ROOT)
        self.assertTrue('project_local_paths' in response)
        self.assertEqual(set(response['project_local_paths']),
                         set(Project.get_local_path_choices()))

        # return local paths are only the ones not used by any active project.
        qs = Project.objects
        used_paths = qs.values_list('local_path', flat=True)
        self.assertFalse(set(response['project_local_paths']) & set(used_paths))
        for project in self.projects:
            local_path = project.local_path
            response = self.get(url, expect=200, auth=self.get_super_credentials())
            self.assertTrue(local_path not in response['project_local_paths'])
            project.delete()
            response = self.get(url, expect=200, auth=self.get_super_credentials())
            self.assertTrue(local_path in response['project_local_paths'])

        # org admin can read config and will get project fields.
        response = self.get(url, expect=200, auth=self.get_normal_credentials())
        self.assertTrue('project_base_dir' in response)
        self.assertTrue('project_local_paths' in response)

        # regular user can read configuration, but won't have project fields.
        response = self.get(url, expect=200, auth=self.get_nobody_credentials())
        self.assertFalse('project_base_dir' in response)
        self.assertFalse('project_local_paths' in response)

        # anonymous/invalid user can't access config.
        self.get(url, expect=401)
        self.get(url, expect=401, auth=self.get_invalid_credentials())

    def test_dashboard(self):
        url = reverse('api:dashboard_view')
        # superuser can read dashboard.
        self.get(url, expect=200, auth=self.get_super_credentials())
        # org admin can read dashboard.
        self.get(url, expect=200, auth=self.get_normal_credentials())
        # regular user can read dashboard.
        self.get(url, expect=200, auth=self.get_nobody_credentials())
        # anonymous/invalid user can't access dashboard.
        self.get(url, expect=401)
        self.get(url, expect=401, auth=self.get_invalid_credentials())
        # FIXME: Test that data on dashboard is filtered based on RBAC.

    def test_mainline(self):

        # =====================================================================
        # PROJECTS - LISTING

        # can get projects list
        projects = reverse('api:project_list')
        # invalid auth
        self.get(projects, expect=401)
        self.get(projects, expect=401, auth=self.get_invalid_credentials())
        # super user
        results = self.get(projects, expect=200, auth=self.get_super_credentials())
        self.assertEquals(results['count'], 10)
        # org admin
        results = self.get(projects, expect=200, auth=self.get_normal_credentials())
        self.assertEquals(results['count'], 6)
        # user on a team
        results = self.get(projects, expect=200, auth=self.get_other_credentials())
        self.assertEquals(results['count'], 5)
        # user not on any teams
        results = self.get(projects, expect=200, auth=self.get_nobody_credentials())
        self.assertEquals(results['count'], 0)

        # can add projects (super user)
        project_dir = tempfile.mkdtemp(dir=settings.PROJECTS_ROOT)
        self._temp_paths.append(project_dir)
        project_data = {
            'name': 'My Test Project',
            'description': 'Does amazing things',
            'local_path': os.path.basename(project_dir),
            'scm_type': 'git', # must not be manual in order to schedule
            'scm_url': 'http://192.168.100.128.git',
            'scm_update_on_launch': '',
            'scm_delete_on_update': None,
            'scm_clean': False,
            'organization': self.organizations[0].pk,
        }
        # Adding a project with scm_type=None should work, but scm_type will be
        # changed to an empty string.  Other boolean fields should accept null
        # or an empty string for False, but save the value as a boolean.
        response = self.post(projects, project_data, expect=201,
                             auth=self.get_super_credentials())
        self.assertEqual(response['scm_type'], u'git')
        self.assertEqual(response['scm_update_on_launch'], False)
        self.assertEqual(response['scm_delete_on_update'], False)
        self.assertEqual(response['scm_clean'], False)

        # can edit project using same local path.
        project_detail = reverse('api:project_detail', args=(response['id'],))
        project_data = self.get(project_detail, expect=200,
                                auth=self.get_super_credentials())
        response = self.put(project_detail, project_data, expect=200,
                            auth=self.get_super_credentials())

        # cannot update using local_path from another project.
        project_data['local_path'] = self.projects[2].local_path
        response = self.put(project_detail, project_data, expect=400,
                            auth=self.get_super_credentials())

        # cannot update using a path that doesn't exist.
        project_data['local_path'] = 'my_secret_invisible_project_path'
        response = self.put(project_detail, project_data, expect=400,
                            auth=self.get_super_credentials())

        # =====================================================================
        # PROJECTS - ACCESS
        project = reverse('api:project_detail', args=(self.projects[3].pk,))
        self.get(project, expect=200, auth=self.get_super_credentials())
        self.get(project, expect=200, auth=self.get_normal_credentials())
        self.get(project, expect=200, auth=self.get_other_credentials())
        self.get(project, expect=403, auth=self.get_nobody_credentials())

        # can create a schedule for a project (doesn't matter if the project
        # has SCM for this test).
        project_schedules = reverse('api:project_schedules_list', args=(self.projects[3].pk,))
        with self.current_user(self.super_django_user):
            response = self.get(project_schedules, expect=200)
            self.assertEqual(response['count'], 0)
            dtstart = now().replace(microsecond=0).strftime('%Y%m%dT%H%M%SZ')
            data = {
                'name': 'test schedule',
                'rrule': 'DTSTART:%s RRULE:FREQ=DAILY;INTERVAL=1' % dtstart,
            }
            response = self.post(project_schedules, data, expect=201)
            schedule_url = response['url']
            response = self.get(schedule_url, expect=200)

        # can delete projects, schedule should be "deleted" along with project.
        self.delete(project, expect=204, auth=self.get_normal_credentials())
        self.get(project, expect=404, auth=self.get_normal_credentials())
        with self.current_user(self.super_django_user):
            self.get(schedule_url, expect=404)

        # can list playbooks for projects
        proj_playbooks = reverse('api:project_playbooks', args=(self.projects[2].pk,))
        got = self.get(proj_playbooks, expect=200, auth=self.get_super_credentials())
        self.assertEqual(got, self.projects[2].playbooks)

        # =====================================================================
        # TEAMS

        all_teams = reverse('api:team_list')
        team1 = reverse('api:team_detail', args=(self.team1.pk,))

        # can list teams
        got = self.get(all_teams, expect=200, auth=self.get_super_credentials())
        self.assertEquals(got['count'], 2)
        # FIXME: for other accounts, also check filtering

        # can get teams
        got = self.get(team1, expect=200, auth=self.get_super_credentials())
        self.assertEquals(got['url'], reverse('api:team_detail', args=(self.team1.pk,)))
        got = self.get(team1, expect=200, auth=self.get_normal_credentials())
        got = self.get(team1, expect=403, auth=self.get_other_credentials())
        self.team1.member_role.members.add(User.objects.get(username='other'))
        self.team1.save()
        got = self.get(team1, expect=200, auth=self.get_other_credentials())
        got = self.get(team1, expect=403, auth=self.get_nobody_credentials())

        new_team  = dict(name='newTeam',  description='blarg', organization=self.organizations[0].pk)
        new_team2 = dict(name='newTeam2', description='blarg', organization=self.organizations[0].pk)
        new_team3 = dict(name='newTeam3', description='bad wolf', organization=self.organizations[0].pk)

        # can add teams
        posted1 = self.post(all_teams, data=new_team, expect=201, auth=self.get_super_credentials())
        self.post(all_teams, data=new_team, expect=400, auth=self.get_super_credentials())
        # normal user is not an admin of organizations[0], but is for [1].
        posted3 = self.post(all_teams, data=new_team2, expect=403, auth=self.get_normal_credentials())
        new_team2['organization'] = self.organizations[1].pk
        posted3 = self.post(all_teams, data=new_team2, expect=201, auth=self.get_normal_credentials())
        self.post(all_teams, data=new_team2, expect=400, auth=self.get_normal_credentials())
        self.post(all_teams, data=new_team3, expect=403, auth=self.get_other_credentials())
        posted1['url']
        url3 = posted3['url']
        posted1['url']

        new_team = Team.objects.create(name='newTeam4', organization=self.organizations[1])
        url = reverse('api:team_detail', args=(new_team.pk,))

        # can delete teams
        self.delete(url, expect=401)
        self.delete(url, expect=403, auth=self.get_nobody_credentials())
        self.delete(url, expect=403, auth=self.get_other_credentials())
        self.delete(url, expect=204, auth=self.get_normal_credentials())
        self.delete(url3, expect=204, auth=self.get_super_credentials())

        # =====================================================================
        # ORGANIZATION TEAMS

        # can list organization teams (filtered by user) -- this is an org admin function
        org_teams = reverse('api:organization_teams_list', args=(self.organizations[1].pk,))
        self.get(org_teams, expect=401)
        data2 = self.get(org_teams, expect=403, auth=self.get_nobody_credentials())
        self.get(org_teams, expect=403, auth=self.get_other_credentials())
        self.get(org_teams, expect=200, auth=self.get_normal_credentials())
        self.get(org_teams, expect=200, auth=self.get_super_credentials())

        # can add teams to organizations
        new_team1 = dict(name='super new team A')
        # also tests that sub posts overwrite the related field:
        new_team2 = dict(name='super new team B', organization=34567)
        new_team3 = dict(name='super new team C')

        self.post(org_teams, new_team1, expect=401)
        self.post(org_teams, new_team1, expect=403, auth=self.get_nobody_credentials())
        self.post(org_teams, new_team1, expect=403, auth=self.get_other_credentials())
        data2 = self.post(org_teams, new_team2, expect=201, auth=self.get_normal_credentials())
        self.post(org_teams, new_team3, expect=201, auth=self.get_super_credentials())

        # can remove teams from organizations
        data2['disassociate'] = 1
        url = data2['url']
        self.post(org_teams, data2, expect=204, auth=self.get_normal_credentials())
        got = self.get(url, expect=404, auth=self.get_normal_credentials())


        # =====================================================================
        # TEAM PROJECTS

        team = Team.objects.filter( organization__pk=self.organizations[1].pk)[0]
        team_projects = reverse('api:team_projects_list', args=(team.pk,))

        p1 = self.projects[0]
        team.member_role.children.add(p1.admin_role)
        team.save()

        got = self.get(team_projects, expect=200, auth=self.get_super_credentials())

        # FIXME: project postablility tests somewhat incomplete.
        # add tests to show we can create new projects on the subresource and so on.

        self.assertEquals(got['count'], 1)

        # =====================================================================
        # TEAMS USER MEMBERSHIP

        team = Team.objects.filter( organization__pk=self.organizations[1].pk)[0]
        team_users = reverse('api:team_users_list', args=(team.pk,))
        for x in team.member_role.members.all():
            team.member_role.members.remove(x)
        team.save()

        # can list uses on teams
        self.get(team_users, expect=401)
        self.get(team_users, expect=401, auth=self.get_invalid_credentials())
        self.get(team_users, expect=403, auth=self.get_nobody_credentials())
        self.get(team_users, expect=403, auth=self.get_other_credentials())
        self.get(team_users, expect=200, auth=self.get_normal_credentials())
        self.get(team_users, expect=200, auth=self.get_super_credentials())

        # can add users to teams (but only users I can see - as an org admin, can now see all users)
        all_users = self.get(reverse('api:user_list'), expect=200, auth=self.get_normal_credentials())
        for x in all_users['results']:
            self.post(team_users, data=x, expect=403, auth=self.get_nobody_credentials())
            self.post(team_users, data=dict(x, is_superuser=False),
                      expect=204, auth=self.get_normal_credentials())
        # The normal admin user can't create a super user vicariously through the team/project
        self.post(team_users, data=dict(username='attempted_superuser_create', password='thepassword',
                  is_superuser=True), expect=403, auth=self.get_normal_credentials())
        # ... but a superuser can
        self.post(team_users, data=dict(username='attempted_superuser_create', password='thepassword',
                  is_superuser=True), expect=201, auth=self.get_super_credentials())

        self.assertEqual(Team.objects.get(pk=team.pk).member_role.members.count(), all_users['count'] + 1)

        # can remove users from teams
        for x in all_users['results']:
            y = dict(id=x['id'], disassociate=1)
            self.post(team_users, data=y, expect=403, auth=self.get_nobody_credentials())
            self.post(team_users, data=y, expect=204, auth=self.get_normal_credentials())

        self.assertEquals(Team.objects.get(pk=team.pk).member_role.members.count(), 1) # Leaving just the super user we created

        # =====================================================================
        # USER TEAMS

        # from a user, can see what teams they are on (related resource)
        other = User.objects.get(username = 'other')
        url = reverse('api:user_teams_list', args=(other.pk,))
        self.get(url, expect=401)
        self.get(url, expect=401, auth=self.get_invalid_credentials())
        self.get(url, expect=403, auth=self.get_nobody_credentials())
        self.organizations[1].member_role.members.add(other)
        # Normal user can only see some teams that other user is a part of,
        # since normal user is not an admin of that organization.
        my_teams1 = self.get(url, expect=200, auth=self.get_normal_credentials())
        my_teams2 = self.get(url, expect=200, auth=self.get_other_credentials())

        my_teams1 = self.get(url, expect=200, auth=self.get_normal_credentials())
        self.assertEqual(my_teams1['count'], 1)
        # Other user should be able to see all his own teams.
        my_teams2 = self.get(url, expect=200, auth=self.get_other_credentials())
        self.assertEqual(my_teams2['count'], 2)

        # =====================================================================
        # USER PROJECTS

        url = reverse('api:user_projects_list', args=(other.pk,))

        # from a user, can see what projects they can see based on team association
        # though this resource doesn't do anything else
        got = self.get(url, expect=200, auth=self.get_other_credentials())
        self.assertEquals(got['count'], 5)
        got = self.get(url, expect=403, auth=self.get_nobody_credentials())
        got = self.get(url, expect=401, auth=self.get_invalid_credentials())
        got = self.get(url, expect=401)
        got = self.get(url, expect=200, auth=self.get_super_credentials())



@override_settings(CELERY_ALWAYS_EAGER=True,
                   CELERY_EAGER_PROPAGATES_EXCEPTIONS=True,
                   ANSIBLE_TRANSPORT='local',
                   PROJECT_UPDATE_IDLE_TIMEOUT=60,
                   PROJECT_UPDATE_VVV=True)
class ProjectUpdatesTest(BaseTransactionTest):

    def setUp(self):
        super(ProjectUpdatesTest, self).setUp()
        self.setup_instances()
        self.start_queue()
        self.setup_users()

    def tearDown(self):
        super(ProjectUpdatesTest, self).tearDown()
        self.terminate_queue()

    def create_project(self, **kwargs):
        cred_fields = ['scm_username', 'scm_password', 'scm_key_data',
                       'scm_key_unlock']
        if set(cred_fields) & set(kwargs.keys()):
            kw = {
                'kind': 'scm',
                'user': self.super_django_user,
            }
            for field in cred_fields:
                if field not in kwargs:
                    continue
                if field.startswith('scm_key_'):
                    kw[field.replace('scm_key_', 'ssh_key_')] = kwargs.pop(field)
                else:
                    kw[field.replace('scm_', '')] = kwargs.pop(field)
            u = kw['user']
            del kw['user']
            credential = Credential.objects.create(**kw)
            credential.admin_role.members.add(u)
            kwargs['credential'] = credential
        project = Project.objects.create(**kwargs)
        project_path = project.get_project_path(check_if_exists=False)
        self._temp_paths.append(project_path)
        return project

    def test_update_scm_url(self):
        # Handle all of the URL formats supported by the SCM systems:
        urls_to_test = [
            # (scm type, original url, new url, new url with username, new url with username and password)

            # git: https://www.kernel.org/pub/software/scm/git/docs/git-clone.html#URLS
            # - ssh://[user@]host.xz[:port]/path/to/repo.git/
            (
                'git', 'ssh://host.xz/path/to/repo.git/', None,
                'ssh://testuser@host.xz/path/to/repo.git/',
                'ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ssh://host.xz:1022/path/to/repo.git', None,
                'ssh://testuser@host.xz:1022/path/to/repo.git',
                'ssh://testuser:testpass@host.xz:1022/path/to/repo.git'),
            (
                'git', 'ssh://user@host.xz/path/to/repo.git/', None,
                'ssh://testuser@host.xz/path/to/repo.git/',
                'ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ssh://user@host.xz:1022/path/to/repo.git', None,
                'ssh://testuser@host.xz:1022/path/to/repo.git', 'ssh://testuser:testpass@host.xz:1022/path/to/repo.git'),
            (
                'git', 'ssh://user:pass@host.xz/path/to/repo.git/', None,
                'ssh://testuser:pass@host.xz/path/to/repo.git/', 'ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ssh://user:pass@host.xz:1022/path/to/repo.git', None,
                'ssh://testuser:pass@host.xz:1022/path/to/repo.git', 'ssh://testuser:testpass@host.xz:1022/path/to/repo.git'),
            # - git://host.xz[:port]/path/to/repo.git/ (doesn't really support authentication)
            (
                'git', 'git://host.xz/path/to/repo.git/', None,
                'git://testuser@host.xz/path/to/repo.git/', 'git://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'git://host.xz:9418/path/to/repo.git', None,
                'git://testuser@host.xz:9418/path/to/repo.git', 'git://testuser:testpass@host.xz:9418/path/to/repo.git'),
            (
                'git', 'git://user@host.xz/path/to/repo.git/', None,
                'git://testuser@host.xz/path/to/repo.git/', 'git://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'git://user@host.xz:9418/path/to/repo.git', None,
                'git://testuser@host.xz:9418/path/to/repo.git', 'git://testuser:testpass@host.xz:9418/path/to/repo.git'),
            # - http[s]://host.xz[:port]/path/to/repo.git/
            (
                'git', 'http://host.xz/path/to/repo.git/', None,
                'http://testuser@host.xz/path/to/repo.git/', 'http://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'http://host.xz:8080/path/to/repo.git', None,
                'http://testuser@host.xz:8080/path/to/repo.git', 'http://testuser:testpass@host.xz:8080/path/to/repo.git'),
            (
                'git', 'http://user@host.xz/path/to/repo.git/', None,
                'http://testuser@host.xz/path/to/repo.git/', 'http://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'http://user@host.xz:8080/path/to/repo.git', None,
                'http://testuser@host.xz:8080/path/to/repo.git', 'http://testuser:testpass@host.xz:8080/path/to/repo.git'),
            (
                'git', 'http://user:pass@host.xz/path/to/repo.git/', None,
                'http://testuser:pass@host.xz/path/to/repo.git/', 'http://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'http://user:pass@host.xz:8080/path/to/repo.git', None,
                'http://testuser:pass@host.xz:8080/path/to/repo.git', 'http://testuser:testpass@host.xz:8080/path/to/repo.git'),
            (
                'git', 'https://host.xz/path/to/repo.git/', None,
                'https://testuser@host.xz/path/to/repo.git/', 'https://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'https://host.xz:8443/path/to/repo.git', None,
                'https://testuser@host.xz:8443/path/to/repo.git', 'https://testuser:testpass@host.xz:8443/path/to/repo.git'),
            (
                'git', 'https://user@host.xz/path/to/repo.git/', None,
                'https://testuser@host.xz/path/to/repo.git/', 'https://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'https://user@host.xz:8443/path/to/repo.git', None,
                'https://testuser@host.xz:8443/path/to/repo.git', 'https://testuser:testpass@host.xz:8443/path/to/repo.git'),
            (
                'git', 'https://user:pass@host.xz/path/to/repo.git/', None,
                'https://testuser:pass@host.xz/path/to/repo.git/', 'https://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'https://user:pass@host.xz:8443/path/to/repo.git', None,
                'https://testuser:pass@host.xz:8443/path/to/repo.git', 'https://testuser:testpass@host.xz:8443/path/to/repo.git'),
            # - ftp[s]://host.xz[:port]/path/to/repo.git/
            (
                'git', 'ftp://host.xz/path/to/repo.git/', None,
                'ftp://testuser@host.xz/path/to/repo.git/', 'ftp://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftp://host.xz:8021/path/to/repo.git', None,
                'ftp://testuser@host.xz:8021/path/to/repo.git', 'ftp://testuser:testpass@host.xz:8021/path/to/repo.git'),
            (
                'git', 'ftp://user@host.xz/path/to/repo.git/', None,
                'ftp://testuser@host.xz/path/to/repo.git/', 'ftp://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftp://user@host.xz:8021/path/to/repo.git', None,
                'ftp://testuser@host.xz:8021/path/to/repo.git', 'ftp://testuser:testpass@host.xz:8021/path/to/repo.git'),
            (
                'git', 'ftp://user:pass@host.xz/path/to/repo.git/', None,
                'ftp://testuser:pass@host.xz/path/to/repo.git/', 'ftp://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftp://user:pass@host.xz:8021/path/to/repo.git', None,
                'ftp://testuser:pass@host.xz:8021/path/to/repo.git', 'ftp://testuser:testpass@host.xz:8021/path/to/repo.git'),
            (
                'git', 'ftps://host.xz/path/to/repo.git/', None,
                'ftps://testuser@host.xz/path/to/repo.git/', 'ftps://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftps://host.xz:8990/path/to/repo.git', None,
                'ftps://testuser@host.xz:8990/path/to/repo.git', 'ftps://testuser:testpass@host.xz:8990/path/to/repo.git'),
            (
                'git', 'ftps://user@host.xz/path/to/repo.git/', None,
                'ftps://testuser@host.xz/path/to/repo.git/', 'ftps://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftps://user@host.xz:8990/path/to/repo.git', None,
                'ftps://testuser@host.xz:8990/path/to/repo.git', 'ftps://testuser:testpass@host.xz:8990/path/to/repo.git'),
            (
                'git', 'ftps://user:pass@host.xz/path/to/repo.git/', None,
                'ftps://testuser:pass@host.xz/path/to/repo.git/', 'ftps://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'ftps://user:pass@host.xz:8990/path/to/repo.git', None,
                'ftps://testuser:pass@host.xz:8990/path/to/repo.git', 'ftps://testuser:testpass@host.xz:8990/path/to/repo.git'),
            # - rsync://host.xz/path/to/repo.git/
            (
                'git', 'rsync://host.xz/path/to/repo.git/', ValueError, ValueError, ValueError),
            # - [user@]host.xz:path/to/repo.git/ (SCP style)
            (
                'git', 'host.xz:path/to/repo.git/', 'git+ssh://host.xz/path/to/repo.git/',
                'git+ssh://testuser@host.xz/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'user@host.xz:path/to/repo.git/', 'git+ssh://user@host.xz/path/to/repo.git/',
                'git+ssh://testuser@host.xz/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'user:pass@host.xz:path/to/repo.git/', 'git+ssh://user:pass@host.xz/path/to/repo.git/',
                'git+ssh://testuser:pass@host.xz/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/path/to/repo.git/'),
            (
                'git', 'host.xz:~/path/to/repo.git/', 'git+ssh://host.xz/~/path/to/repo.git/',
                'git+ssh://testuser@host.xz/~/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/~/path/to/repo.git/'),
            (
                'git', 'user@host.xz:~/path/to/repo.git/', 'git+ssh://user@host.xz/~/path/to/repo.git/',
                'git+ssh://testuser@host.xz/~/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/~/path/to/repo.git/'),
            (
                'git', 'user:pass@host.xz:~/path/to/repo.git/', 'git+ssh://user:pass@host.xz/~/path/to/repo.git/',
                'git+ssh://testuser:pass@host.xz/~/path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz/~/path/to/repo.git/'),
            (
                'git', 'host.xz:/path/to/repo.git/', 'git+ssh://host.xz//path/to/repo.git/',
                'git+ssh://testuser@host.xz//path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz//path/to/repo.git/'),
            (
                'git', 'user@host.xz:/path/to/repo.git/', 'git+ssh://user@host.xz//path/to/repo.git/',
                'git+ssh://testuser@host.xz//path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz//path/to/repo.git/'),
            (
                'git', 'user:pass@host.xz:/path/to/repo.git/', 'git+ssh://user:pass@host.xz//path/to/repo.git/',
                'git+ssh://testuser:pass@host.xz//path/to/repo.git/', 'git+ssh://testuser:testpass@host.xz//path/to/repo.git/'),
            # - /path/to/repo.git/ (local file)
            ('git', '/path/to/repo.git', ValueError, ValueError, ValueError),
            ('git', 'path/to/repo.git', ValueError,  ValueError, ValueError),
            # - file:///path/to/repo.git/
            ('git', 'file:///path/to/repo.git', ValueError, ValueError, ValueError),
            ('git', 'file://localhost/path/to/repo.git', ValueError, ValueError, ValueError),
            # Invalid SSH URLs:
            ('git', 'ssh:github.com:ansible/ansible-examples.git', ValueError, ValueError, ValueError),
            ('git', 'ssh://github.com:ansible/ansible-examples.git', ValueError, ValueError, ValueError),
            # Special case for github URLs:
            ('git', 'git@github.com:ansible/ansible-examples.git', 'git+ssh://git@github.com/ansible/ansible-examples.git', ValueError, ValueError),
            ('git', 'bob@github.com:ansible/ansible-examples.git', ValueError, ValueError, ValueError),
            # Special case for bitbucket URLs:
            ('git', 'ssh://git@bitbucket.org/foo/bar.git', None, ValueError, ValueError),
            ('git', 'ssh://git@altssh.bitbucket.org:443/foo/bar.git', None, ValueError, ValueError),
            ('git', 'ssh://hg@bitbucket.org/foo/bar.git', ValueError, ValueError, ValueError),
            ('git', 'ssh://hg@altssh.bitbucket.org:443/foo/bar.git', ValueError, ValueError, ValueError),

            # hg: http://www.selenic.com/mercurial/hg.1.html#url-paths
            # - local/filesystem/path[#revision]
            ('hg', '/path/to/repo', ValueError, ValueError, ValueError),
            ('hg', 'path/to/repo/', ValueError, ValueError, ValueError),
            ('hg', '/path/to/repo#rev', ValueError, ValueError, ValueError),
            ('hg', 'path/to/repo/#rev', ValueError, ValueError, ValueError),
            # - file://local/filesystem/path[#revision]
            ('hg', 'file:///path/to/repo', ValueError, ValueError, ValueError),
            ('hg', 'file://localhost/path/to/repo/', ValueError, ValueError, ValueError),
            ('hg', 'file:///path/to/repo#rev', ValueError, ValueError, ValueError),
            ('hg', 'file://localhost/path/to/repo/#rev', ValueError, ValueError, ValueError),
            # - http://[user[:pass]@]host[:port]/[path][#revision]
            (
                'hg', 'http://host.xz/path/to/repo/', None,
                'http://testuser@host.xz/path/to/repo/', 'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'http://host.xz:8080/path/to/repo', None,
                'http://testuser@host.xz:8080/path/to/repo', 'http://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'hg', 'http://user@host.xz/path/to/repo/', None,
                'http://testuser@host.xz/path/to/repo/', 'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'http://user@host.xz:8080/path/to/repo', None,
                'http://testuser@host.xz:8080/path/to/repo', 'http://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'hg', 'http://user:pass@host.xz/path/to/repo/', None, 'http://testuser:pass@host.xz/path/to/repo/',
                'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'http://user:pass@host.xz:8080/path/to/repo', None,
                'http://testuser:pass@host.xz:8080/path/to/repo',
                'http://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'hg', 'http://host.xz/path/to/repo/#rev', None,
                'http://testuser@host.xz/path/to/repo/#rev', 'http://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'http://host.xz:8080/path/to/repo#rev', None,
                'http://testuser@host.xz:8080/path/to/repo#rev', 'http://testuser:testpass@host.xz:8080/path/to/repo#rev'),
            (
                'hg', 'http://user@host.xz/path/to/repo/#rev', None,
                'http://testuser@host.xz/path/to/repo/#rev', 'http://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'http://user@host.xz:8080/path/to/repo#rev', None,
                'http://testuser@host.xz:8080/path/to/repo#rev', 'http://testuser:testpass@host.xz:8080/path/to/repo#rev'),
            (
                'hg', 'http://user:pass@host.xz/path/to/repo/#rev', None,
                'http://testuser:pass@host.xz/path/to/repo/#rev', 'http://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'http://user:pass@host.xz:8080/path/to/repo#rev', None,
                'http://testuser:pass@host.xz:8080/path/to/repo#rev', 'http://testuser:testpass@host.xz:8080/path/to/repo#rev'),
            # - https://[user[:pass]@]host[:port]/[path][#revision]
            (
                'hg', 'https://host.xz/path/to/repo/', None,
                'https://testuser@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'https://host.xz:8443/path/to/repo', None,
                'https://testuser@host.xz:8443/path/to/repo', 'https://testuser:testpass@host.xz:8443/path/to/repo'),
            (
                'hg', 'https://user@host.xz/path/to/repo/', None,
                'https://testuser@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'https://user@host.xz:8443/path/to/repo', None,
                'https://testuser@host.xz:8443/path/to/repo', 'https://testuser:testpass@host.xz:8443/path/to/repo'),
            (
                'hg', 'https://user:pass@host.xz/path/to/repo/', None,
                'https://testuser:pass@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'hg', 'https://user:pass@host.xz:8443/path/to/repo', None,
                'https://testuser:pass@host.xz:8443/path/to/repo', 'https://testuser:testpass@host.xz:8443/path/to/repo'),
            (
                'hg', 'https://host.xz/path/to/repo/#rev', None,
                'https://testuser@host.xz/path/to/repo/#rev', 'https://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'https://host.xz:8443/path/to/repo#rev', None,
                'https://testuser@host.xz:8443/path/to/repo#rev', 'https://testuser:testpass@host.xz:8443/path/to/repo#rev'),
            (
                'hg', 'https://user@host.xz/path/to/repo/#rev', None,
                'https://testuser@host.xz/path/to/repo/#rev', 'https://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'https://user@host.xz:8443/path/to/repo#rev', None,
                'https://testuser@host.xz:8443/path/to/repo#rev', 'https://testuser:testpass@host.xz:8443/path/to/repo#rev'),
            (
                'hg', 'https://user:pass@host.xz/path/to/repo/#rev', None,
                'https://testuser:pass@host.xz/path/to/repo/#rev', 'https://testuser:testpass@host.xz/path/to/repo/#rev'),
            (
                'hg', 'https://user:pass@host.xz:8443/path/to/repo#rev', None,
                'https://testuser:pass@host.xz:8443/path/to/repo#rev', 'https://testuser:testpass@host.xz:8443/path/to/repo#rev'),
            # - ssh://[user@]host[:port]/[path][#revision]
            # Password is always stripped out for hg when using SSH.
            ('hg', 'ssh://host.xz/path/to/repo/', None, 'ssh://testuser@host.xz/path/to/repo/', 'ssh://testuser@host.xz/path/to/repo/'),
            ('hg', 'ssh://host.xz:1022/path/to/repo', None, 'ssh://testuser@host.xz:1022/path/to/repo', 'ssh://testuser@host.xz:1022/path/to/repo'),
            ('hg', 'ssh://user@host.xz/path/to/repo/', None, 'ssh://testuser@host.xz/path/to/repo/', 'ssh://testuser@host.xz/path/to/repo/'),
            ('hg', 'ssh://user@host.xz:1022/path/to/repo', None, 'ssh://testuser@host.xz:1022/path/to/repo', 'ssh://testuser@host.xz:1022/path/to/repo'),
            (
                'hg', 'ssh://user:pass@host.xz/path/to/repo/',
                'ssh://user@host.xz/path/to/repo/',
                'ssh://testuser@host.xz/path/to/repo/',
                'ssh://testuser@host.xz/path/to/repo/'),
            (
                'hg', 'ssh://user:pass@host.xz:1022/path/to/repo',
                'ssh://user@host.xz:1022/path/to/repo',
                'ssh://testuser@host.xz:1022/path/to/repo',
                'ssh://testuser@host.xz:1022/path/to/repo'),
            (
                'hg', 'ssh://host.xz/path/to/repo/#rev', None,
                'ssh://testuser@host.xz/path/to/repo/#rev', 'ssh://testuser@host.xz/path/to/repo/#rev'),
            (
                'hg', 'ssh://host.xz:1022/path/to/repo#rev', None,
                'ssh://testuser@host.xz:1022/path/to/repo#rev', 'ssh://testuser@host.xz:1022/path/to/repo#rev'),
            (
                'hg', 'ssh://user@host.xz/path/to/repo/#rev', None,
                'ssh://testuser@host.xz/path/to/repo/#rev', 'ssh://testuser@host.xz/path/to/repo/#rev'),
            (
                'hg', 'ssh://user@host.xz:1022/path/to/repo#rev', None,
                'ssh://testuser@host.xz:1022/path/to/repo#rev', 'ssh://testuser@host.xz:1022/path/to/repo#rev'),
            (
                'hg', 'ssh://user:pass@host.xz/path/to/repo/#rev',
                'ssh://user@host.xz/path/to/repo/#rev',
                'ssh://testuser@host.xz/path/to/repo/#rev', 'ssh://testuser@host.xz/path/to/repo/#rev'),
            (
                'hg', 'ssh://user:pass@host.xz:1022/path/to/repo#rev', 'ssh://user@host.xz:1022/path/to/repo#rev',
                'ssh://testuser@host.xz:1022/path/to/repo#rev', 'ssh://testuser@host.xz:1022/path/to/repo#rev'),
            # Special case for bitbucket URLs:
            ('hg', 'ssh://hg@bitbucket.org/foo/bar', None, ValueError, ValueError),
            ('hg', 'ssh://hg@altssh.bitbucket.org:443/foo/bar', None, ValueError, ValueError),
            ('hg', 'ssh://bob@bitbucket.org/foo/bar', ValueError, ValueError, ValueError),
            ('hg', 'ssh://bob@altssh.bitbucket.org:443/foo/bar', ValueError, ValueError, ValueError),

            # svn: http://svnbook.red-bean.com/en/1.7/svn-book.html#svn.advanced.reposurls
            # - file:///    Direct repository access (on local disk)
            ('svn', 'file:///path/to/repo', ValueError, ValueError, ValueError),
            ('svn', 'file://localhost/path/to/repo/', ValueError, ValueError, ValueError),
            # - http://     Access via WebDAV protocol to Subversion-aware Apache server
            (
                'svn', 'http://host.xz/path/to/repo/', None,
                'http://testuser@host.xz/path/to/repo/', 'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'http://host.xz:8080/path/to/repo', None,
                'http://testuser@host.xz:8080/path/to/repo', 'http://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'svn', 'http://user@host.xz/path/to/repo/', None,
                'http://testuser@host.xz/path/to/repo/', 'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'http://user@host.xz:8080/path/to/repo', None,
                'http://testuser@host.xz:8080/path/to/repo', 'http://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'svn', 'http://user:pass@host.xz/path/to/repo/', None,
                'http://testuser:pass@host.xz/path/to/repo/', 'http://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'http://user:pass@host.xz:8080/path/to/repo', None,
                'http://testuser:pass@host.xz:8080/path/to/repo', 'http://testuser:testpass@host.xz:8080/path/to/repo'),
            # - https://    Same as http://, but with SSL encryption
            (
                'svn', 'https://host.xz/path/to/repo/', None,
                'https://testuser@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'https://host.xz:8080/path/to/repo', None,
                'https://testuser@host.xz:8080/path/to/repo', 'https://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'svn', 'https://user@host.xz/path/to/repo/', None,
                'https://testuser@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'https://user@host.xz:8080/path/to/repo', None,
                'https://testuser@host.xz:8080/path/to/repo', 'https://testuser:testpass@host.xz:8080/path/to/repo'),
            (
                'svn', 'https://user:pass@host.xz/path/to/repo/', None,
                'https://testuser:pass@host.xz/path/to/repo/', 'https://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'https://user:pass@host.xz:8080/path/to/repo', None,
                'https://testuser:pass@host.xz:8080/path/to/repo', 'https://testuser:testpass@host.xz:8080/path/to/repo'),
            # - svn://      Access via custom protocol to an svnserve server
            (
                'svn', 'svn://host.xz/path/to/repo/', None,
                'svn://testuser@host.xz/path/to/repo/', 'svn://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn://host.xz:3690/path/to/repo', None, 
                'svn://testuser@host.xz:3690/path/to/repo', 'svn://testuser:testpass@host.xz:3690/path/to/repo'),
            (
                'svn', 'svn://user@host.xz/path/to/repo/', None,
                'svn://testuser@host.xz/path/to/repo/', 'svn://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn://user@host.xz:3690/path/to/repo', None,
                'svn://testuser@host.xz:3690/path/to/repo', 'svn://testuser:testpass@host.xz:3690/path/to/repo'),
            (
                'svn', 'svn://user:pass@host.xz/path/to/repo/', None,
                'svn://testuser:pass@host.xz/path/to/repo/', 'svn://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn://user:pass@host.xz:3690/path/to/repo', None,
                'svn://testuser:pass@host.xz:3690/path/to/repo', 'svn://testuser:testpass@host.xz:3690/path/to/repo'),
            # - svn+ssh://  Same as svn://, but through an SSH tunnel
            (
                'svn', 'svn+ssh://host.xz/path/to/repo/', None,
                'svn+ssh://testuser@host.xz/path/to/repo/', 'svn+ssh://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn+ssh://host.xz:1022/path/to/repo', None,
                'svn+ssh://testuser@host.xz:1022/path/to/repo', 'svn+ssh://testuser:testpass@host.xz:1022/path/to/repo'),
            (
                'svn', 'svn+ssh://user@host.xz/path/to/repo/', None,
                'svn+ssh://testuser@host.xz/path/to/repo/', 'svn+ssh://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn+ssh://user@host.xz:1022/path/to/repo', None,
                'svn+ssh://testuser@host.xz:1022/path/to/repo', 'svn+ssh://testuser:testpass@host.xz:1022/path/to/repo'),
            (
                'svn', 'svn+ssh://user:pass@host.xz/path/to/repo/', None,
                'svn+ssh://testuser:pass@host.xz/path/to/repo/', 'svn+ssh://testuser:testpass@host.xz/path/to/repo/'),
            (
                'svn', 'svn+ssh://user:pass@host.xz:1022/path/to/repo', None,
                'svn+ssh://testuser:pass@host.xz:1022/path/to/repo', 'svn+ssh://testuser:testpass@host.xz:1022/path/to/repo'),
        ]

        # Some invalid URLs.
        for scm_type in ('git', 'svn', 'hg'):
            urls_to_test.append((scm_type, 'host', ValueError, ValueError, ValueError))
            urls_to_test.append((scm_type, '/path', ValueError, ValueError, ValueError))
            urls_to_test.append((scm_type, 'mailto:joe@example.com', ValueError, ValueError, ValueError))
            urls_to_test.append((scm_type, 'telnet://host.xz/path/to/repo', ValueError, ValueError, ValueError))

        def is_exception(e):
            return bool(isinstance(e, Exception) or (isinstance(e, type) and issubclass(e, Exception)))

        for url_opts in urls_to_test:
            scm_type, url, new_url, new_url_u, new_url_up = url_opts
            new_url = new_url or url
            new_url_u = new_url_u or url
            new_url_up = new_url_up or url

            # Check existing URL as-is.
            if is_exception(new_url):
                self.assertRaises(new_url, update_scm_url, scm_type, url)
            else:
                updated_url = update_scm_url(scm_type, url)
                self.assertEqual(new_url, updated_url)
                if updated_url.startswith('git+ssh://'):
                    new_url2 = new_url.replace('git+ssh://', '', 1).replace('/', ':', 1)
                    updated_url2 = update_scm_url(scm_type, url, scp_format=True)
                    self.assertEqual(new_url2, updated_url2)

            # Check URL with username replaced.
            if is_exception(new_url_u):
                self.assertRaises(new_url_u, update_scm_url, scm_type, url, username='testuser')
            else:
                updated_url = update_scm_url(scm_type, url, username='testuser')
                self.assertEqual(new_url_u, updated_url)
                if updated_url.startswith('git+ssh://'):
                    new_url2 = new_url_u.replace('git+ssh://', '', 1).replace('/', ':', 1)
                    updated_url2 = update_scm_url(scm_type, url, username='testuser', scp_format=True)
                    self.assertEqual(new_url2, updated_url2)

            # Check URL with username and password replaced.
            if is_exception(new_url_up):
                self.assertRaises(new_url_up, update_scm_url, scm_type, url, username='testuser', password='testpass')
            else:
                updated_url = update_scm_url(scm_type, url, username='testuser', password='testpass')
                self.assertEqual(new_url_up, updated_url)
                if updated_url.startswith('git+ssh://'):
                    new_url2 = new_url_up.replace('git+ssh://', '', 1).replace('/', ':', 1)
                    updated_url2 = update_scm_url(scm_type, url, username='testuser', password='testpass', scp_format=True)
                    self.assertEqual(new_url2, updated_url2)

    def is_public_key_in_authorized_keys(self):
        auth_keys = set()
        auth_keys_path = os.path.expanduser('~/.ssh/authorized_keys')
        if os.path.exists(auth_keys_path):
            for line in file(auth_keys_path, 'r'):
                if line.strip():
                    key = tuple(line.strip().split()[:2])
                    auth_keys.add(key)
        pub_keys = set()
        rsa_key_path = os.path.expanduser('~/.ssh/id_rsa.pub')
        if os.path.exists(rsa_key_path):
            for line in file(rsa_key_path, 'r'):
                if line.strip():
                    key = tuple(line.strip().split()[:2])
                    pub_keys.add(key)
        dsa_key_path = os.path.expanduser('~/.ssh/id_dsa.pub')
        if os.path.exists(dsa_key_path):
            for line in file(dsa_key_path, 'r'):
                if line.strip():
                    key = tuple(line.strip().split()[:2])
                    pub_keys.add(key)
        return bool(auth_keys & pub_keys)

    def check_project_update(self, project, should_fail=False, **kwargs):
        pu = kwargs.pop('project_update', None)
        should_error = kwargs.pop('should_error', False)
        if not pu:
            pu = project.update(**kwargs)
            self.assertTrue(pu)
        pu = ProjectUpdate.objects.get(pk=pu.pk)
        if should_error:
            self.assertEqual(pu.status, 'error',
                             pu.result_stdout + pu.result_traceback)
        elif should_fail:
            self.assertEqual(pu.status, 'failed',
                             pu.result_stdout + pu.result_traceback)
        elif should_fail is False:
            self.assertEqual(pu.status, 'successful',
                             pu.result_stdout + pu.result_traceback)
        else:
            #print pu.result_stdout
            pass # If should_fail is None, we don't care.
        # Get the SCM URL from the job args, if it starts with a '/' we aren't
        # handling the URL correctly.
        if not should_error:
            scm_url_in_args_re = re.compile(r'\\(?:\\\\)??"scm_url\\(?:\\\\)??": \\(?:\\\\)??"(.*?)\\(?:\\\\)??"')
            match = scm_url_in_args_re.search(pu.job_args)
            self.assertTrue(match, pu.job_args)
            scm_url_in_args = match.groups()[0]
            self.assertFalse(scm_url_in_args.startswith('/'), scm_url_in_args)
        #return pu
        # Make sure scm_password doesn't show up anywhere in args or output
        # from project update.
        if project.credential:
            scm_password = kwargs.get('scm_password',
                                      decrypt_field(project.credential,
                                                    'password'))
            if scm_password:
                self.assertFalse(scm_password in pu.job_args, pu.job_args)
                self.assertFalse(scm_password in json.dumps(pu.job_env),
                                 json.dumps(pu.job_env))
                # FIXME: Not filtering password from stdout since saving it
                # directly to a file.
                #self.assertFalse(scm_password in pu.result_stdout,
                #                 pu.result_stdout)
                self.assertFalse(scm_password in pu.result_traceback,
                                 pu.result_traceback)
        # Make sure scm_key_unlock doesn't show up anywhere in args or output
        # from project update.
        if project.credential:
            scm_key_unlock = kwargs.get('scm_key_unlock',
                                        decrypt_field(project.credential,
                                                      'ssh_key_unlock'))
            if scm_key_unlock:
                self.assertFalse(scm_key_unlock in pu.job_args, pu.job_args)
                self.assertFalse(scm_key_unlock in json.dumps(pu.job_env),
                                 json.dumps(pu.job_env))
                self.assertFalse(scm_key_unlock in pu.result_stdout,
                                 pu.result_stdout)
                self.assertFalse(scm_key_unlock in pu.result_traceback,
                                 pu.result_traceback)
        project = Project.objects.get(pk=project.pk)
        self.assertEqual(project.last_update, pu)
        self.assertEqual(project.last_update_failed, pu.failed)
        return pu

    def change_file_in_project(self, project):
        project_path = project.get_project_path()
        self.assertTrue(project_path)
        for root, dirs, files in os.walk(project_path):
            for f in files:
                if f.startswith('.') or f == 'yadayada.txt':
                    continue
                path_parts = os.path.relpath(root, project_path).split(os.sep)
                if any([x.startswith('.') and x != '.' for x in path_parts]):
                    continue
                path = os.path.join(root, f)
                before = file(path, 'rb').read()
                #print 'changed', path
                file(path, 'wb').write('CHANGED FILE')
                after = file(path, 'rb').read()
                return path, before, after
        self.fail('no file found to change!')

    def check_project_scm(self, project):
        project = Project.objects.get(pk=project.pk)
        project_path = project.get_project_path(check_if_exists=False)
        # If project could be auto-updated on creation, the project dir should
        # already exist, otherwise run an initial checkout.
        if project.scm_type:
            self.assertTrue(project.last_update)
            self.check_project_update(project,
                                      project_update=project.last_update)
            self.assertTrue(os.path.exists(project_path))
        else:
            self.assertFalse(os.path.exists(project_path))
            self.check_project_update(project)
            self.assertTrue(os.path.exists(project_path))

        # TODO: Removed pending resolution of: https://github.com/ansible/ansible/issues/6582
        # # Stick a new untracked file in the project.
        untracked_path = os.path.join(project_path, 'yadayada.txt')
        self.assertFalse(os.path.exists(untracked_path))
        file(untracked_path, 'wb').write('yabba dabba doo')
        self.assertTrue(os.path.exists(untracked_path))
        # # Update to existing checkout (should leave untracked file alone).
        # self.check_project_update(project)
        # self.assertTrue(os.path.exists(untracked_path))
        # # Change file then update (with scm_clean=False). Modified file should
        # # not be changed.
        # self.assertFalse(project.scm_clean)
        # modified_path, before, after = self.change_file_in_project(project)
        # # Mercurial still returns successful if a modified file is present.
        # should_fail = bool(project.scm_type != 'hg')
        # self.check_project_update(project, should_fail=should_fail)
        # content = file(modified_path, 'rb').read()
        # self.assertEqual(content, after)
        # self.assertTrue(os.path.exists(untracked_path))
        # # Set scm_clean=True then try to update again.  Modified file should
        # # have been replaced with the original.  Untracked file should still be
        # # present.
        # project.scm_clean = True
        # project.save()
        # self.check_project_update(project)
        # content = file(modified_path, 'rb').read()
        # self.assertEqual(content, before)
        # self.assertTrue(os.path.exists(untracked_path))
        # # If scm_type or scm_url changes, scm_delete_on_next_update should be
        # # set, causing project directory (including untracked file) to be
        # # completely blown away, but only for the next update..
        # self.assertFalse(project.scm_delete_on_update)
        # self.assertFalse(project.scm_delete_on_next_update)
        # scm_type = project.scm_type
        # project.scm_type = ''
        # project.save()
        # self.assertTrue(project.scm_delete_on_next_update)
        # project.scm_type = scm_type
        # project.save()
        # self.check_project_update(project)
        # self.assertFalse(os.path.exists(untracked_path))
        # # Check that the flag is cleared after the update, and that an
        # # untracked file isn't blown away.
        # project = Project.objects.get(pk=project.pk)
        # self.assertFalse(project.scm_delete_on_next_update)
        # file(untracked_path, 'wb').write('yabba dabba doo')
        # self.assertTrue(os.path.exists(untracked_path))
        # self.check_project_update(project)
        # self.assertTrue(os.path.exists(untracked_path))


        # Set scm_delete_on_update=True then update again.  Project directory
        # (including untracked file) should be completely blown away.
        self.assertFalse(project.scm_delete_on_update)
        project.scm_delete_on_update = True
        project.save()
        self.check_project_update(project)
        self.assertFalse(os.path.exists(untracked_path))
        # Change username/password for private projects and verify the update
        # fails (but doesn't cause the task to hang).
        scm_url_parts = urlparse.urlsplit(project.scm_url)
        # FIXME: Implement these tests again with new credentials!
        if 0 and project.scm_username and project.scm_password:
            scm_username = project.scm_username
            should_still_fail = not (getpass.getuser() == scm_username and
                                     scm_url_parts.hostname == 'localhost' and
                                     'ssh' in scm_url_parts.scheme and
                                     self.is_public_key_in_authorized_keys())
            # Clear username only.
            project = Project.objects.get(pk=project.pk)
            project.scm_username = ''
            project.save()
            self.check_project_update(project, should_fail=should_still_fail)
            # Try invalid username.
            project = Project.objects.get(pk=project.pk)
            project.scm_username = 'not a\\ valid\' user" name'
            project.save()
            self.check_project_update(project, should_fail=True)
            # Clear username and password.
            project = Project.objects.get(pk=project.pk)
            project.scm_username = ''
            project.scm_password = ''
            project.save()
            self.check_project_update(project, should_fail=should_still_fail)
            # Set username, but no password.
            project = Project.objects.get(pk=project.pk)
            project.scm_username = scm_username
            project.save()
            self.check_project_update(project, should_fail=should_still_fail)
            # Set username, with invalid password.
            project = Project.objects.get(pk=project.pk)
            project.scm_password = 'not a\\ valid\' "password'
            project.save()
            if project.scm_type == 'svn':
                self.check_project_update(project, should_fail=True) # should_still_fail)
            else:
                self.check_project_update(project, should_fail=should_still_fail)
        # Test that we can delete project updates.
        for pu in project.project_updates.all():
            pu_url = reverse('api:project_update_detail', args=(pu.pk,))
            with self.current_user(self.super_django_user):
                self.delete(pu_url, expect=204)

    def test_create_project_with_scm(self):
        scm_url = getattr(settings, 'TEST_GIT_PUBLIC_HTTPS',
                          'https://github.com/ansible/ansible.github.com.git')
        if not all([scm_url]):
            self.skipTest('no public git repo defined for https!')
        projects_url = reverse('api:project_list')
        credentials_url = reverse('api:credential_list')
        org = self.make_organizations(self.super_django_user, 1)[0]
        # Test basic project creation without a credential.
        project_data = {
            'name': 'my public git project over https',
            'scm_type': 'git',
            'scm_url': scm_url,
            'organization': org.id,
        }
        with self.current_user(self.super_django_user):
            self.post(projects_url, project_data, expect=201)
        # Test with an invalid URL.
        project_data = {
            'name': 'my local git project',
            'scm_type': 'git',
            'scm_url': 'file:///path/to/repo.git',
            'organization': org.id,
        }
        with self.current_user(self.super_django_user):
            self.post(projects_url, project_data, expect=400)
        # Test creation with a credential.
        credential_data = {
            'name': 'my scm credential',
            'kind': 'scm',
            'user': self.super_django_user.pk,
            'username': 'testuser',
            'password': 'testpass',
        }
        with self.current_user(self.super_django_user):
            response = self.post(credentials_url, credential_data, expect=201)
            credential_id = response['id']
        project_data = {
            'name': 'my git project over https with credential',
            'scm_type': 'git',
            'scm_url': scm_url,
            'credential': credential_id,
            'organization': org.id,
        }
        with self.current_user(self.super_django_user):
            self.post(projects_url, project_data, expect=201)
        # Test creation with an invalid credential type.
        ssh_credential_data = {
            'name': 'my ssh credential',
            'kind': 'ssh',
            'user': self.super_django_user.pk,
            'username': 'testuser',
            'password': 'testpass',
        }
        with self.current_user(self.super_django_user):
            response = self.post(credentials_url, ssh_credential_data,
                                 expect=201)
            ssh_credential_id = response['id']
        project_data = {
            'name': 'my git project with invalid credential type',
            'scm_type': 'git',
            'scm_url': scm_url,
            'credential': ssh_credential_id,
            'organization': org.id,
        }
        with self.current_user(self.super_django_user):
            self.post(projects_url, project_data, expect=400)
        # Test special case for github/bitbucket URLs.
        project_data = {
            'name': 'my github project over ssh',
            'scm_type': 'git',
            'scm_url': 'ssh://git@github.com/ansible/ansible.github.com.git',
            'credential': credential_id,
            'organization': org.id,
        }
        with self.current_user(self.super_django_user):
            self.post(projects_url, project_data, expect=201)

    def test_delete_project_update_as_org_admin(self):
        scm_url = getattr(settings, 'TEST_GIT_PUBLIC_HTTPS',
                          'https://github.com/ansible/ansible.github.com.git')
        if not all([scm_url]):
            self.skipTest('no public git repo defined for https!')
        projects_url = reverse('api:project_list')
        org = self.make_organizations(self.super_django_user, 1)[0]
        project_data = {
            'name': 'my public git project over https',
            'scm_type': 'git',
            'scm_url': scm_url,
            'organization': org.id,
        }
        org.admin_role.members.add(self.normal_django_user)
        with self.current_user(self.super_django_user):
            del_proj = self.post(projects_url, project_data, expect=201)
            del_proj = Project.objects.get(pk=del_proj["id"])
            org.projects.add(del_proj)
            pu = self.check_project_update(del_proj)
        pu_url = reverse('api:project_update_detail', args=(pu.id,))
        self.delete(pu_url, expect=403, auth=self.get_other_credentials())
        self.delete(pu_url, expect=204, auth=self.get_normal_credentials())

    def test_public_git_project_over_https(self):
        scm_url = getattr(settings, 'TEST_GIT_PUBLIC_HTTPS',
                          'https://github.com/ansible/ansible.github.com.git')
        if not all([scm_url]):
            self.skipTest('no public git repo defined for https!')
        project = self.create_project(
            name='my public git project over https',
            scm_type='git',
            scm_url=scm_url,
        )
        self.check_project_scm(project)
        # Test passing username/password for public project. Though they're not
        # needed, the update should still work.
        scm_username = getattr(settings, 'TEST_GIT_USERNAME', '')
        scm_password = getattr(settings, 'TEST_GIT_PASSWORD', '')
        if scm_username or scm_password:
            project2 = self.create_project(
                name='my other public git project over https',
                scm_type='git',
                scm_url=scm_url,
                scm_username=scm_username,
                scm_password=scm_password,
            )
            self.check_project_update(project2)

    def test_private_git_project_over_https(self):
        scm_url = getattr(settings, 'TEST_GIT_PRIVATE_HTTPS', '')
        scm_username = getattr(settings, 'TEST_GIT_USERNAME', '')
        scm_password = getattr(settings, 'TEST_GIT_PASSWORD', '')
        if not all([scm_url, scm_username, scm_password]):
            self.skipTest('no private git repo defined for https!')
        project = self.create_project(
            name='my private git project over https',
            scm_type='git',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        self.check_project_scm(project)

    def test_private_git_project_over_ssh(self):
        scm_url = getattr(settings, 'TEST_GIT_PRIVATE_SSH', '')
        scm_key_data = getattr(settings, 'TEST_GIT_KEY_DATA', '')
        scm_username = getattr(settings, 'TEST_GIT_USERNAME', '')
        scm_password = 'blahblahblah' # getattr(settings, 'TEST_GIT_PASSWORD', '')
        if not all([scm_url, scm_key_data, scm_username, scm_password]):
            self.skipTest('no private git repo defined for ssh!')
        project = self.create_project(
            name='my private git project over ssh',
            scm_type='git',
            scm_url=scm_url,
            scm_key_data=scm_key_data,
        )
        self.check_project_scm(project)
        # Test project using SSH username/password instead of key. Should fail
        # because of bad password, but never hang.
        project2 = self.create_project(
            name='my other private git project over ssh',
            scm_type='git',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        bool('github.com' in scm_url and scm_username != 'git')
        self.check_project_update(project2, should_fail=None) # , should_error=should_error)

    def test_scm_key_unlock_on_project_update(self):
        scm_url = 'git@github.com:ansible/ansible.github.com.git'
        project = self.create_project(
            name='my git project over ssh with encrypted key',
            scm_type='git',
            scm_url=scm_url,
            scm_key_data=TEST_SSH_KEY_DATA_LOCKED,
            scm_key_unlock=TEST_SSH_KEY_DATA_UNLOCK,
        )
        url = reverse('api:project_update_view', args=(project.pk,))
        with self.current_user(self.super_django_user):
            response = self.get(url, expect=200)
        self.assertTrue(response['can_update'])
        with self.current_user(self.super_django_user):
            response = self.post(url, {}, expect=202)
        project_update = project.project_updates.order_by('-pk')[0]
        self.check_project_update(project, should_fail=None,
                                  project_update=project_update)
        # Verify that we responded to ssh-agent prompt.
        self.assertTrue('Identity added' in project_update.result_stdout,
                        project_update.result_stdout)
        # Try again with a bad unlock password.
        project = self.create_project(
            name='my git project over ssh with encrypted key and bad pass',
            scm_type='git',
            scm_url=scm_url,
            scm_key_data=TEST_SSH_KEY_DATA_LOCKED,
            scm_key_unlock='not the right password',
        )
        with self.current_user(self.super_django_user):
            response = self.get(url, expect=200)
        self.assertTrue(response['can_update'])
        with self.current_user(self.super_django_user):
            response = self.post(url, {}, expect=202)
        project_update = project.project_updates.order_by('-pk')[0]
        self.check_project_update(project, should_fail=None,
                                  project_update=project_update)
        # Verify response to ssh-agent prompt, did not accept password.
        self.assertTrue('Bad passphrase' in project_update.result_stdout,
                        project_update.result_stdout)
        self.assertFalse('Identity added' in project_update.result_stdout,
                         project_update.result_stdout)

    def create_local_git_repo(self):
        repo_dir = tempfile.mkdtemp()
        self._temp_paths.append(repo_dir)
        handle, playbook_path = tempfile.mkstemp(suffix='.yml', dir=repo_dir)
        test_playbook_file = os.fdopen(handle, 'w')
        test_playbook_file.write(TEST_PLAYBOOK)
        test_playbook_file.close()
        subprocess.check_call(['git', 'init', '.'], cwd=repo_dir,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.check_call(['git', 'add', os.path.basename(playbook_path)],
                              cwd=repo_dir, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE)
        subprocess.check_call(['git', 'commit', '-m', 'blah'], cwd=repo_dir,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return repo_dir

    def _test_git_project_from_local_path(self):
        repo_dir = self.create_local_git_repo()
        project = self.create_project(
            name='my git project from local path',
            scm_type='git',
            scm_url=repo_dir,
        )
        self.check_project_scm(project)

    def test_git_project_via_ssh_loopback(self):
        scm_username = getattr(settings, 'TEST_SSH_LOOPBACK_USERNAME', '')
        scm_password = getattr(settings, 'TEST_SSH_LOOPBACK_PASSWORD', '')
        if not all([scm_username, scm_password]):
            self.skipTest('no ssh loopback username/password defined!')
        repo_dir = self.create_local_git_repo()
        scm_url = 'ssh://localhost%s' % repo_dir
        project = self.create_project(
            name='my git project via ssh loopback',
            scm_type='git',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        self.check_project_scm(project)

    def test_public_hg_project_over_https(self):
        scm_url = getattr(settings, 'TEST_HG_PUBLIC_HTTPS',
                          'https://bitbucket.org/cchurch/django-hotrunner')
        if not all([scm_url]):
            self.skipTest('no public hg repo defined for https!')
        project = self.create_project(
            name='my public hg project over https',
            scm_type='hg',
            scm_url=scm_url,
        )
        self.check_project_scm(project)
        # Test passing username/password for public project. Though they're not
        # needed, the update should still work.
        scm_username = getattr(settings, 'TEST_HG_USERNAME', '')
        scm_password = getattr(settings, 'TEST_HG_PASSWORD', '')
        if scm_username or scm_password:
            project2 = self.create_project(
                name='my other public hg project over https',
                scm_type='hg',
                scm_url=scm_url,
                scm_username=scm_username,
                scm_password=scm_password,
            )
            self.check_project_update(project2)

    def test_private_hg_project_over_https(self):
        scm_url = getattr(settings, 'TEST_HG_PRIVATE_HTTPS', '')
        scm_username = getattr(settings, 'TEST_HG_USERNAME', '')
        scm_password = getattr(settings, 'TEST_HG_PASSWORD', '')
        if not all([scm_url, scm_username, scm_password]):
            self.skipTest('no private hg repo defined for https!')
        project = self.create_project(
            name='my private hg project over https',
            scm_type='hg',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        self.check_project_scm(project)

    def test_private_hg_project_over_ssh(self):
        scm_url = getattr(settings, 'TEST_HG_PRIVATE_SSH', '')
        scm_key_data = getattr(settings, 'TEST_HG_KEY_DATA', '')
        if not all([scm_url, scm_key_data]):
            self.skipTest('no private hg repo defined for ssh!')
        project = self.create_project(
            name='my private hg project over ssh',
            scm_type='hg',
            scm_url=scm_url,
            scm_key_data=scm_key_data,
        )
        self.check_project_scm(project)
        # hg doesn't support password for ssh:// urls.

    def create_local_hg_repo(self):
        repo_dir = tempfile.mkdtemp()
        self._temp_paths.append(repo_dir)
        handle, playbook_path = tempfile.mkstemp(suffix='.yml', dir=repo_dir)
        test_playbook_file = os.fdopen(handle, 'w')
        test_playbook_file.write(TEST_PLAYBOOK)
        test_playbook_file.close()
        subprocess.check_call(['hg', 'init', '.'], cwd=repo_dir,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        subprocess.check_call(['hg', 'add', os.path.basename(playbook_path)],
                              cwd=repo_dir, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE)
        subprocess.check_call(['hg', 'commit', '-m', 'blah'], cwd=repo_dir,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return repo_dir

    def _test_hg_project_from_local_path(self):
        repo_dir = self.create_local_hg_repo()
        project = self.create_project(
            name='my hg project from local path',
            scm_type='hg',
            scm_url=repo_dir,
        )
        self.check_project_scm(project)

    def _test_hg_project_via_ssh_loopback(self):
        # hg doesn't support password for ssh:// urls.
        scm_username = getattr(settings, 'TEST_SSH_LOOPBACK_USERNAME', '')
        if not all([scm_username]):
            self.skipTest('no ssh loopback username defined!')
        if not self.is_public_key_in_authorized_keys():
            self.skipTest('ssh loopback for hg requires public key in authorized keys')
        repo_dir = self.create_local_hg_repo()
        scm_url = 'ssh://localhost/%s' % repo_dir
        project = self.create_project(
            name='my hg project via ssh loopback',
            scm_type='hg',
            scm_url=scm_url,
            scm_username=scm_username,
        )
        self.check_project_scm(project)

    def test_public_svn_project_over_https(self):
        scm_url = getattr(settings, 'TEST_SVN_PUBLIC_HTTPS',
                          'https://github.com/ansible/ansible.github.com')
        if not all([scm_url]):
            self.skipTest('no public svn repo defined for https!')
        project = self.create_project(
            name='my public svn project over https',
            scm_type='svn',
            scm_url=scm_url,
        )
        self.check_project_scm(project)

    def test_private_svn_project_over_https(self):
        scm_url = getattr(settings, 'TEST_SVN_PRIVATE_HTTPS', '')
        scm_username = getattr(settings, 'TEST_SVN_USERNAME', '')
        scm_password = getattr(settings, 'TEST_SVN_PASSWORD', '')
        if not all([scm_url, scm_username, scm_password]):
            self.skipTest('no private svn repo defined for https!')
        project = self.create_project(
            name='my private svn project over https',
            scm_type='svn',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        self.check_project_scm(project)

    def create_local_svn_repo(self):
        repo_dir = tempfile.mkdtemp()
        self._temp_paths.append(repo_dir)
        subprocess.check_call(['svnadmin', 'create', '.'], cwd=repo_dir,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        handle, playbook_path = tempfile.mkstemp(suffix='.yml', dir=repo_dir)
        test_playbook_file = os.fdopen(handle, 'w')
        test_playbook_file.write(TEST_PLAYBOOK)
        test_playbook_file.close()
        subprocess.check_call(['svn', 'import', '-m', 'blah',
                               os.path.basename(playbook_path),
                               'file://%s/%s' % (repo_dir, os.path.basename(playbook_path))],
                              cwd=repo_dir, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE)
        return repo_dir

    def _test_svn_project_from_local_path(self):
        repo_dir = self.create_local_svn_repo()
        scm_url = 'file://%s' % repo_dir
        project = self.create_project(
            name='my svn project from local path',
            scm_type='svn',
            scm_url=scm_url,
        )
        self.check_project_scm(project)

    def test_svn_project_via_ssh_loopback(self):
        scm_username = getattr(settings, 'TEST_SSH_LOOPBACK_USERNAME', '')
        scm_password = getattr(settings, 'TEST_SSH_LOOPBACK_PASSWORD', '')
        if not all([scm_username, scm_password]):
            self.skipTest('no ssh loopback username/password defined!')
        repo_dir = self.create_local_svn_repo()
        scm_url = 'svn+ssh://localhost%s' % repo_dir
        project = self.create_project(
            name='my svn project via ssh loopback',
            scm_type='svn',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
        )
        self.check_project_scm(project)

    def create_test_job_template(self, **kwargs):
        opts = {
            'name': 'test-job-template %s' % str(now()),
            'inventory': self.inventory,
            'project': self.project,
            'credential': self.credential,
            'job_type': 'run',
        }
        try:
            opts['playbook'] = self.project.playbooks[0]
        except (AttributeError, IndexError):
            pass
        opts.update(kwargs)
        self.job_template = JobTemplate.objects.create(**opts)
        return self.job_template

    def create_test_job(self, **kwargs):
        job_template = kwargs.pop('job_template', None)
        if job_template:
            self.job = job_template.create_job(**kwargs)
        else:
            opts = {
                'name': 'test-job %s' % str(now()),
                'inventory': self.inventory,
                'project': self.project,
                'credential': self.credential,
                'job_type': 'run',
            }
            try:
                opts['playbook'] = self.project.playbooks[0]
            except (AttributeError, IndexError):
                pass
            opts.update(kwargs)
            self.job = Job.objects.create(**opts)
        return self.job

    # TODO: We need to test this another way due to concurrency conflicts
    #       Will add some tests for the task runner system
    def _test_update_on_launch(self):
        scm_url = getattr(settings, 'TEST_GIT_PUBLIC_HTTPS',
                          'https://github.com/ansible/ansible.github.com.git')
        if not all([scm_url]):
            self.skipTest('no public git repo defined for https!')
        self.organization = self.make_organizations(self.super_django_user, 1)[0]
        self.inventory = Inventory.objects.create(name='test-inventory',
                                                  description='description for test-inventory',
                                                  organization=self.organization)
        self.host = self.inventory.hosts.create(name='host.example.com',
                                                inventory=self.inventory)
        self.group = self.inventory.groups.create(name='test-group',
                                                  inventory=self.inventory)
        self.group.hosts.add(self.host)
        self.credential = Credential.objects.create(name='test-creds')
        self.credential.admin_role.members.add(self.super_django_user)
        self.project = self.create_project(
            name='my public git project over https',
            scm_type='git',
            scm_url=scm_url,
            scm_update_on_launch=True)
        # First update triggered by saving a new project with SCM.
        self.assertEqual(self.project.project_updates.count(), 1)
        self.check_project_update(self.project)
        self.assertEqual(self.project.project_updates.count(), 2)
        job_template = self.create_test_job_template()
        job = self.create_test_job(job_template=job_template)
        self.assertEqual(job.status, 'new')
        self.assertFalse(job.passwords_needed_to_start)
        self.assertTrue(job.signal_start())
        time.sleep(10) # Need some time to wait for the dependency to run
        job = Job.objects.get(pk=job.pk)
        self.assertTrue(job.status in ('successful', 'failed'))
        self.assertEqual(self.project.project_updates.count(), 3)

    def _test_update_on_launch_with_project_passwords(self):
        scm_url = getattr(settings, 'TEST_GIT_PRIVATE_HTTPS', '')
        scm_username = getattr(settings, 'TEST_GIT_USERNAME', '')
        scm_password = getattr(settings, 'TEST_GIT_PASSWORD', '')
        if not all([scm_url, scm_username, scm_password]):
            self.skipTest('no private git repo defined for https!')
        self.organization = self.make_organizations(self.super_django_user, 1)[0]
        self.inventory = Inventory.objects.create(name='test-inventory',
                                                  description='description for test-inventory',
                                                  organization=self.organization)
        self.host = self.inventory.hosts.create(name='host.example.com',
                                                inventory=self.inventory)
        self.group = self.inventory.groups.create(name='test-group',
                                                  inventory=self.inventory)
        self.group.hosts.add(self.host)
        self.credential = Credential.objects.create(name='test-creds')
        self.credential.admin_role.members.add(self.super_django_user)
        self.project = self.create_project(
            name='my private git project over https',
            scm_type='git',
            scm_url=scm_url,
            scm_username=scm_username,
            scm_password=scm_password,
            scm_update_on_launch=True,
        )
        self.check_project_update(self.project)
        self.assertEqual(self.project.project_updates.count(), 2)
        job_template = self.create_test_job_template()
        job = self.create_test_job(job_template=job_template)
        self.assertEqual(job.status, 'new')
        self.assertFalse(job.passwords_needed_to_start)
        self.assertTrue(job.start())
        self.assertTrue(job.status in ('pending', 'waiting'), job.status)
        job = Job.objects.get(pk=job.pk)
        self.assertTrue(job.status in ('successful', 'failed'),
                        job.result_stdout + job.result_traceback)
        self.assertEqual(self.project.project_updates.count(), 3)
        # Try again but set a bad project password - the job should flag an
        # error because the project update failed.
        cred = self.project.credential
        cred.password = 'bad scm password'
        cred.save()
        job = self.create_test_job(job_template=job_template)
        self.assertEqual(job.status, 'new')
        self.assertFalse(job.passwords_needed_to_start)
        self.assertTrue(job.start())
        self.assertTrue(job.status in ('pending', 'waiting'), job.status)
        job = Job.objects.get(pk=job.pk)
        # FIXME: Not quite sure why the project update still returns successful
        # in this case?
        #self.assertEqual(job.status, 'error',
        #                 '\n'.join([job.result_stdout, job.result_traceback]))
        self.assertEqual(self.project.project_updates.count(), 4)
