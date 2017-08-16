# Python
import uuid

# AWX
from awx.main.models import * # noqa
from awx.main.tests.base import BaseTestMixin

TEST_PLAYBOOK = '''- hosts: all
  gather_facts: false
  tasks:
  - name: woohoo
    command: test 1 = 1
'''


class BaseJobTestMixin(BaseTestMixin):


    def _create_inventory(self, name, organization, created_by,
                          groups_hosts_dict):
        '''Helper method for creating inventory with groups and hosts.'''
        inventory = organization.inventories.create(
            name=name,
            created_by=created_by,
        )
        for group_name, host_names in groups_hosts_dict.items():
            group = inventory.groups.create(
                name=group_name,
                created_by=created_by,
            )
            for host_name in host_names:
                host = inventory.hosts.create(
                    name=host_name,
                    created_by=created_by,
                )
                group.hosts.add(host)
        return inventory

    def populate(self):
        # Here's a little story about the AWX Bread Company, or ABC.  They
        # make machines that make bread - bakers, slicers, and packagers - and
        # these machines are each controlled by a Linux boxes, which is in turn
        # managed by AWX.

        # Sue is the super user.  You don't mess with Sue or you're toast. Ha.
        self.user_sue = self.make_user('sue', super_user=True)

        # There are three organizations in ABC using Ansible, since it's the
        # best thing for dev ops automation since, well, sliced bread.

        # Engineering - They design and build the machines.
        self.org_eng = Organization.objects.create(
            name='engineering',
            created_by=self.user_sue,
        )
        # Support - They fix it when it's not working.
        self.org_sup = Organization.objects.create(
            name='support',
            created_by=self.user_sue,
        )
        # Operations - They implement the production lines using the machines.
        self.org_ops = Organization.objects.create(
            name='operations',
            created_by=self.user_sue,
        )

        # Alex is Sue's IT assistant who can also administer all of the
        # organizations.
        self.user_alex = self.make_user('alex')
        self.org_eng.admin_role.members.add(self.user_alex)
        self.org_sup.admin_role.members.add(self.user_alex)
        self.org_ops.admin_role.members.add(self.user_alex)

        # Bob is the head of engineering.  He's an admin for engineering, but
        # also a user within the operations organization (so he can see the
        # results if things go wrong in production).
        self.user_bob = self.make_user('bob')
        self.org_eng.admin_role.members.add(self.user_bob)
        self.org_ops.member_role.members.add(self.user_bob)

        # Chuck is the lead engineer.  He has full reign over engineering, but
        # no other organizations.
        self.user_chuck = self.make_user('chuck')
        self.org_eng.admin_role.members.add(self.user_chuck)

        # Doug is the other engineer working under Chuck.  He can write
        # playbooks and check them, but Chuck doesn't quite think he's ready to
        # run them yet.  Poor Doug.
        self.user_doug = self.make_user('doug')
        self.org_eng.member_role.members.add(self.user_doug)

        # Juan is another engineer working under Chuck.  He has a little more freedom
        # to run playbooks but can't create job templates
        self.user_juan = self.make_user('juan')
        self.org_eng.member_role.members.add(self.user_juan)

        # Hannibal is Chuck's right-hand man.  Chuck usually has him create the job
        # templates that the rest of the team will use
        self.user_hannibal = self.make_user('hannibal')
        self.org_eng.member_role.members.add(self.user_hannibal)

        # Eve is the head of support.  She can also see what goes on in
        # operations to help them troubleshoot problems.
        self.user_eve = self.make_user('eve')
        self.org_sup.admin_role.members.add(self.user_eve)
        self.org_ops.member_role.members.add(self.user_eve)

        # Frank is the other support guy.
        self.user_frank = self.make_user('frank')
        self.org_sup.member_role.members.add(self.user_frank)

        # Greg is the head of operations.
        self.user_greg = self.make_user('greg')
        self.org_ops.admin_role.members.add(self.user_greg)

        # Holly is an operations engineer.
        self.user_holly = self.make_user('holly')
        self.org_ops.member_role.members.add(self.user_holly)

        # Iris is another operations engineer.
        self.user_iris = self.make_user('iris')
        self.org_ops.member_role.members.add(self.user_iris)

        # Randall and Billybob are new ops interns that ops uses to test
        # their playbooks and inventory
        self.user_randall = self.make_user('randall')
        self.org_ops.member_role.members.add(self.user_randall)

        # He works with Randall
        self.user_billybob = self.make_user('billybob')
        self.org_ops.member_role.members.add(self.user_billybob)

        # Jim is the newest intern. He can login, but can't do anything quite yet
        # except make everyone else fresh coffee.
        self.user_jim = self.make_user('jim')

        # There are three main projects, one each for the development, test and
        # production branches of the playbook repository.  All three orgs can
        # use the production branch, support can use the production and testing
        # branches, and operations can only use the production branch.
        self.proj_dev = self.make_project('dev', 'development branch',
                                          self.user_sue, TEST_PLAYBOOK)
        self.org_eng.projects.add(self.proj_dev)
        self.proj_test = self.make_project('test', 'testing branch',
                                           self.user_sue, TEST_PLAYBOOK)
        #self.org_eng.projects.add(self.proj_test) # No more multi org projects
        self.org_sup.projects.add(self.proj_test)
        self.proj_prod = self.make_project('prod', 'production branch',
                                           self.user_sue, TEST_PLAYBOOK)
        #self.org_eng.projects.add(self.proj_prod) # No more multi org projects
        #self.org_sup.projects.add(self.proj_prod) # No more multi org projects
        self.org_ops.projects.add(self.proj_prod)

        # Operations also has 2 additional projects specific to the east/west
        # production environments.
        self.proj_prod_east = self.make_project('prod-east',
                                                'east production branch',
                                                self.user_sue, TEST_PLAYBOOK)
        self.org_ops.projects.add(self.proj_prod_east)
        self.proj_prod_west = self.make_project('prod-west',
                                                'west production branch',
                                                self.user_sue, TEST_PLAYBOOK)
        self.org_ops.projects.add(self.proj_prod_west)

        # The engineering organization has a set of servers to use for
        # development and testing (2 bakers, 1 slicer, 1 packager).
        self.inv_eng = self._create_inventory(
            name='engineering environment',
            organization=self.org_eng,
            created_by=self.user_sue,
            groups_hosts_dict={
                'bakers': ['eng-baker1', 'eng-baker2'],
                'slicers': ['eng-slicer1'],
                'packagers': ['eng-packager1'],
            },
        )

        # The support organization has a set of servers to use for
        # testing and reproducing problems from operations (1 baker, 1 slicer,
        # 1 packager).
        self.inv_sup = self._create_inventory(
            name='support environment',
            organization=self.org_sup,
            created_by=self.user_sue,
            groups_hosts_dict={
                'bakers': ['sup-baker1'],
                'slicers': ['sup-slicer1'],
                'packagers': ['sup-packager1'],
            },
        )

        # The operations organization manages multiple sets of servers for the
        # east and west production facilities.
        self.inv_ops_east = self._create_inventory(
            name='east production environment',
            organization=self.org_ops,
            created_by=self.user_sue,
            groups_hosts_dict={
                'bakers': ['east-baker%d' % n for n in range(1, 4)],
                'slicers': ['east-slicer%d' % n for n in range(1, 3)],
                'packagers': ['east-packager%d' % n for n in range(1, 3)],
            },
        )
        self.inv_ops_west = self._create_inventory(
            name='west production environment',
            organization=self.org_ops,
            created_by=self.user_sue,
            groups_hosts_dict={
                'bakers': ['west-baker%d' % n for n in range(1, 6)],
                'slicers': ['west-slicer%d' % n for n in range(1, 4)],
                'packagers': ['west-packager%d' % n for n in range(1, 3)],
            },
        )

        # Operations is divided into teams to work on the east/west servers.
        # Greg and Holly work on east, Greg and iris work on west.
        self.team_ops_east = self.org_ops.teams.create(
            name='easterners',
            created_by=self.user_sue)
        self.team_ops_east.member_role.children.add(self.proj_prod.admin_role)
        self.team_ops_east.member_role.children.add(self.proj_prod_east.admin_role)
        self.team_ops_east.member_role.members.add(self.user_greg)
        self.team_ops_east.member_role.members.add(self.user_holly)
        self.team_ops_west = self.org_ops.teams.create(
            name='westerners',
            created_by=self.user_sue)
        self.team_ops_west.member_role.children.add(self.proj_prod.admin_role)
        self.team_ops_west.member_role.children.add(self.proj_prod_west.admin_role)
        self.team_ops_west.member_role.members.add(self.user_greg)
        self.team_ops_west.member_role.members.add(self.user_iris)

        # The south team is no longer active having been folded into the east team
        # FIXME: This code can be removed (probably)
        #  - this case has been removed as we've gotten rid of the active flag, keeping
        #    code around in case this has ramifications on some test failures.. if
        #    you find this message and all tests are passing, then feel free to remove this
        #    - anoek 2016-03-10
        #self.team_ops_south = self.org_ops.teams.create(
        #    name='southerners',
        #    created_by=self.user_sue,
        #    active=False,
        #)
        #self.team_ops_south.member_role.children.add(self.proj_prod.admin_role)
        #self.team_ops_south.member_role.members.add(self.user_greg)

        # The north team is going to be deleted
        self.team_ops_north = self.org_ops.teams.create(
            name='northerners',
            created_by=self.user_sue,
        )
        self.team_ops_north.member_role.children.add(self.proj_prod.admin_role)
        self.team_ops_north.member_role.members.add(self.user_greg)

        # The testers team are interns that can only check playbooks but can't
        # run them
        self.team_ops_testers = self.org_ops.teams.create(
            name='testers',
            created_by=self.user_sue,
        )
        self.team_ops_testers.member_role.children.add(self.proj_prod.admin_role)
        self.team_ops_testers.member_role.members.add(self.user_randall)
        self.team_ops_testers.member_role.members.add(self.user_billybob)

        # Each user has his/her own set of credentials.
        from awx.main.tests.data.ssh import (TEST_SSH_KEY_DATA,
                                             TEST_SSH_KEY_DATA_LOCKED,
                                             TEST_SSH_KEY_DATA_UNLOCK)
        self.cred_sue = Credential.objects.create(
            username='sue',
            password=TEST_SSH_KEY_DATA,
            created_by=self.user_sue,
        )
        self.cred_sue.admin_role.members.add(self.user_sue)

        self.cred_sue_ask = Credential.objects.create(
            username='sue',
            password='ASK',
            created_by=self.user_sue,
        )
        self.cred_sue_ask.admin_role.members.add(self.user_sue)

        self.cred_sue_ask_many = Credential.objects.create(
            username='sue',
            password='ASK',
            become_method='sudo',
            become_username='root',
            become_password='ASK',
            ssh_key_data=TEST_SSH_KEY_DATA_LOCKED,
            ssh_key_unlock='ASK',
            created_by=self.user_sue,
        )
        self.cred_sue_ask_many.admin_role.members.add(self.user_sue)

        self.cred_bob = Credential.objects.create(
            username='bob',
            password='ASK',
            created_by=self.user_sue,
        )
        self.cred_bob.use_role.members.add(self.user_bob)

        self.cred_chuck = Credential.objects.create(
            username='chuck',
            ssh_key_data=TEST_SSH_KEY_DATA,
            created_by=self.user_sue,
        )
        self.cred_chuck.use_role.members.add(self.user_chuck)

        self.cred_doug = Credential.objects.create(
            username='doug',
            password='doug doesn\'t mind his password being saved. this '
                     'is why we dont\'t let doug actually run jobs.',
            created_by=self.user_sue,
        )
        self.cred_doug.use_role.members.add(self.user_doug)

        self.cred_eve = Credential.objects.create(
            username='eve',
            password='ASK',
            become_method='sudo',
            become_username='root',
            become_password='ASK',
            created_by=self.user_sue,
        )
        self.cred_eve.use_role.members.add(self.user_eve)

        self.cred_frank = Credential.objects.create(
            username='frank',
            password='fr@nk the t@nk',
            created_by=self.user_sue,
        )
        self.cred_frank.use_role.members.add(self.user_frank)

        self.cred_greg = Credential.objects.create(
            username='greg',
            ssh_key_data=TEST_SSH_KEY_DATA_LOCKED,
            ssh_key_unlock='ASK',
            created_by=self.user_sue,
        )
        self.cred_greg.use_role.members.add(self.user_greg)

        self.cred_holly = Credential.objects.create(
            username='holly',
            password='holly rocks',
            created_by=self.user_sue,
        )
        self.cred_holly.use_role.members.add(self.user_holly)

        self.cred_iris = Credential.objects.create(
            username='iris',
            password='ASK',
            created_by=self.user_sue,
        )
        self.cred_iris.use_role.members.add(self.user_iris)

        # Each operations team also has shared credentials they can use.
        self.cred_ops_east = Credential.objects.create(
            username='east',
            ssh_key_data=TEST_SSH_KEY_DATA_LOCKED,
            ssh_key_unlock=TEST_SSH_KEY_DATA_UNLOCK,
            created_by = self.user_sue,
        )
        self.team_ops_east.member_role.children.add(self.cred_ops_east.use_role)

        self.cred_ops_west = Credential.objects.create(
            username='west',
            password='Heading270',
            created_by = self.user_sue,
        )
        self.team_ops_west.member_role.children.add(self.cred_ops_west.use_role)


        # FIXME: This code can be removed (probably)
        #  - this case has been removed as we've gotten rid of the active flag, keeping
        #    code around in case this has ramifications on some test failures.. if
        #    you find this message and all tests are passing, then feel free to remove this
        #    - anoek 2016-03-10
        #self.cred_ops_south = self.team_ops_south.credentials.create(
        #    username='south',
        #    password='Heading180',
        #    created_by = self.user_sue,
        #)

        self.cred_ops_north = Credential.objects.create(
            username='north',
            password='Heading0',
            created_by = self.user_sue,
        )
        self.team_ops_north.member_role.children.add(self.cred_ops_north.admin_role)

        self.cred_ops_test = Credential.objects.create(
            username='testers',
            password='HeadingNone',
            created_by = self.user_sue,
        )
        self.team_ops_testers.member_role.children.add(self.cred_ops_test.use_role)

        # Engineering has job templates to check/run the dev project onto
        # their own inventory.
        self.jt_eng_check = JobTemplate.objects.create(
            name='eng-dev-check',
            job_type='check',
            inventory= self.inv_eng,
            project=self.proj_dev,
            playbook=self.proj_dev.playbooks[0],
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_eng_check = self.jt_eng_check.create_job(
        #     created_by=self.user_sue,
        #     credential=self.cred_doug,
        # )
        self.jt_eng_run = JobTemplate.objects.create(
            name='eng-dev-run',
            job_type='run',
            inventory= self.inv_eng,
            project=self.proj_dev,
            playbook=self.proj_dev.playbooks[0],
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
            ask_credential_on_launch=True,
        )
        # self.job_eng_run = self.jt_eng_run.create_job(
        #     created_by=self.user_sue,
        #     credential=self.cred_chuck,
        # )

        # Support has job templates to check/run the test project onto
        # their own inventory.
        self.jt_sup_check = JobTemplate.objects.create(
            name='sup-test-check',
            job_type='check',
            inventory= self.inv_sup,
            project=self.proj_test,
            playbook=self.proj_test.playbooks[0],
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_sup_check = self.jt_sup_check.create_job(
        #     created_by=self.user_sue,
        #     credential=self.cred_frank,
        # )
        self.jt_sup_run = JobTemplate.objects.create(
            name='sup-test-run',
            job_type='run',
            inventory= self.inv_sup,
            project=self.proj_test,
            playbook=self.proj_test.playbooks[0],
            host_config_key=uuid.uuid4().hex,
            credential=self.cred_eve,
            created_by=self.user_sue,
        )
        # self.job_sup_run = self.jt_sup_run.create_job(
        #     created_by=self.user_sue,
        # )

        # Operations has job templates to check/run the prod project onto
        # both east and west inventories, by default using the team credential.
        self.jt_ops_east_check = JobTemplate.objects.create(
            name='ops-east-prod-check',
            job_type='check',
            inventory= self.inv_ops_east,
            project=self.proj_prod,
            playbook=self.proj_prod.playbooks[0],
            credential=self.cred_ops_east,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_ops_east_check = self.jt_ops_east_check.create_job(
        #     created_by=self.user_sue,
        # )
        self.jt_ops_east_run = JobTemplate.objects.create(
            name='ops-east-prod-run',
            job_type='run',
            inventory= self.inv_ops_east,
            project=self.proj_prod,
            playbook=self.proj_prod.playbooks[0],
            credential=self.cred_ops_east,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        self.jt_ops_east_run_prod_east = JobTemplate.objects.create(
            name='ops-east-prod-run-on-prod-east',
            job_type='run',
            inventory= self.inv_ops_east,
            project=self.proj_prod_east,
            playbook=self.proj_prod_east.playbooks[0],
            credential=self.cred_ops_east,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_ops_east_run = self.jt_ops_east_run.create_job(
        #     created_by=self.user_sue,
        # )
        self.jt_ops_west_check = JobTemplate.objects.create(
            name='ops-west-prod-check',
            job_type='check',
            inventory= self.inv_ops_west,
            project=self.proj_prod,
            playbook=self.proj_prod.playbooks[0],
            credential=self.cred_ops_west,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        self.jt_ops_west_check_test_team = JobTemplate.objects.create(
            name='ops-west-prod-check-testers',
            job_type='check',
            inventory= self.inv_ops_west,
            project=self.proj_prod,
            playbook=self.proj_prod.playbooks[0],
            credential=self.cred_ops_test,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_ops_west_check = self.jt_ops_west_check.create_job(
        #     created_by=self.user_sue,
        # )
        self.jt_ops_west_run = JobTemplate.objects.create(
            name='ops-west-prod-run',
            job_type='run',
            inventory= self.inv_ops_west,
            project=self.proj_prod,
            playbook=self.proj_prod.playbooks[0],
            credential=self.cred_ops_west,
            host_config_key=uuid.uuid4().hex,
            created_by=self.user_sue,
        )
        # self.job_ops_west_run = self.jt_ops_west_run.create_job(
        #     created_by=self.user_sue,
        # )

    def setUp(self):
        super(BaseJobTestMixin, self).setUp()
        self.start_rabbit()
        self.setup_instances()
        self.populate()
        self.start_queue()

    def tearDown(self):
        super(BaseJobTestMixin, self).tearDown()
        self.stop_rabbit()
        self.terminate_queue()
