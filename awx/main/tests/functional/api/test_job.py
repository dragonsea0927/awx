import pytest
import mock

from dateutil.parser import parse
from dateutil.relativedelta import relativedelta

from rest_framework.exceptions import PermissionDenied

from awx.api.versioning import reverse
from awx.api.views import RelatedJobsPreventDeleteMixin, UnifiedJobDeletionMixin

from awx.main.models import JobTemplate, User, Job


@pytest.mark.django_db
def test_extra_credentials(get, organization_factory, job_template_factory, credential):
    objs = organization_factory("org", superusers=['admin'])
    jt = job_template_factory("jt", organization=objs.organization,
                              inventory='test_inv', project='test_proj').job_template
    jt.credentials.add(credential)
    jt.save()
    job = jt.create_unified_job()

    url = reverse('api:job_extra_credentials_list', kwargs={'version': 'v2', 'pk': job.pk})
    response = get(url, user=objs.superusers.admin)
    assert response.data.get('count') == 1


@pytest.mark.django_db
def test_job_relaunch_permission_denied_response(
        post, get, inventory, project, credential, net_credential, machine_credential):
    jt = JobTemplate.objects.create(name='testjt', inventory=inventory, project=project)
    jt.credentials.add(machine_credential)
    jt_user = User.objects.create(username='jobtemplateuser')
    jt.execute_role.members.add(jt_user)
    job = jt.create_unified_job()

    # User capability is shown for this
    r = get(job.get_absolute_url(), jt_user, expect=200)
    assert r.data['summary_fields']['user_capabilities']['start']

    # Job has prompted extra_credential, launch denied w/ message
    job.launch_config.credentials.add(net_credential)
    r = post(reverse('api:job_relaunch', kwargs={'pk':job.pk}), {}, jt_user, expect=403)
    assert 'launched with prompted fields' in r.data['detail']
    assert 'do not have permission' in r.data['detail']


@pytest.mark.django_db
def test_job_relaunch_without_creds(post, inventory, project, admin_user):
    jt = JobTemplate.objects.create(
        name='testjt', inventory=inventory,
        project=project
    )
    job = jt.create_unified_job()
    post(
        url=reverse('api:job_relaunch', kwargs={'pk':job.pk}),
        data={},
        user=admin_user,
        expect=201
    )


@pytest.mark.django_db
@pytest.mark.parametrize("status,hosts", [
    ('all', 'host1,host2,host3'),
    ('failed', 'host3'),
])
def test_job_relaunch_on_failed_hosts(post, inventory, project, machine_credential, admin_user, status, hosts):
    h1 = inventory.hosts.create(name='host1')  # no-op
    h2 = inventory.hosts.create(name='host2')  # changed host
    h3 = inventory.hosts.create(name='host3')  # failed host
    jt = JobTemplate.objects.create(
        name='testjt', inventory=inventory,
        project=project
    )
    jt.credentials.add(machine_credential)
    job = jt.create_unified_job(_eager_fields={'status': 'failed'}, limit='host1,host2,host3')
    job.job_events.create(event='playbook_on_stats')
    job.job_host_summaries.create(host=h1, failed=False, ok=1, changed=0, failures=0, host_name=h1.name)
    job.job_host_summaries.create(host=h2, failed=False, ok=0, changed=1, failures=0, host_name=h2.name)
    job.job_host_summaries.create(host=h3, failed=False, ok=0, changed=0, failures=1, host_name=h3.name)

    r = post(
        url=reverse('api:job_relaunch', kwargs={'pk':job.pk}),
        data={'hosts': status},
        user=admin_user,
        expect=201
    )
    assert r.data.get('limit') == hosts


@pytest.mark.django_db
def test_block_unprocessed_events(delete, admin_user, mocker):
    time_of_finish = parse("Thu Feb 28 09:10:20 2013 -0500")
    job = Job.objects.create(
        emitted_events=1,
        status='finished',
        finished=time_of_finish
    )
    request = mock.MagicMock()

    class MockView(UnifiedJobDeletionMixin):
        model = Job

        def get_object(self):
            return job

    view = MockView()

    time_of_request = time_of_finish + relativedelta(seconds=2)
    with mock.patch('awx.api.views.now', lambda: time_of_request):
        r = view.destroy(request)
        assert r.status_code == 400


@pytest.mark.django_db
def test_block_related_unprocessed_events(mocker, organization, project, delete, admin_user):
    job_template = JobTemplate.objects.create(
        project=project,
        playbook='helloworld.yml'
    )
    time_of_finish = parse("Thu Feb 23 14:17:24 2012 -0500")
    Job.objects.create(
        emitted_events=1,
        status='finished',
        finished=time_of_finish,
        job_template=job_template,
        project=project
    )
    view = RelatedJobsPreventDeleteMixin()
    time_of_request = time_of_finish + relativedelta(seconds=2)
    with mock.patch('awx.api.views.now', lambda: time_of_request):
        with pytest.raises(PermissionDenied):
            view.perform_destroy(organization)
