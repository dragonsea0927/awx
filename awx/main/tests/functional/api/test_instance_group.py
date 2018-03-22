import pytest

from awx.api.versioning import reverse
from awx.main.models import (
    InstanceGroup,
    ProjectUpdate,
)


@pytest.fixture
def instance_group(job_factory):
    ig = InstanceGroup(name="east")
    ig.save()
    return ig


@pytest.fixture
def tower_instance_group():
    ig = InstanceGroup(name='tower')
    ig.save()
    return ig


@pytest.fixture
def create_job_factory(job_factory, instance_group):
    def fn(status='running'):
        j = job_factory()
        j.status = status
        j.instance_group = instance_group
        j.save()
        return j
    return fn


@pytest.fixture
def create_project_update_factory(instance_group, project):
    def fn(status='running'):
        pu = ProjectUpdate(project=project)
        pu.status = status
        pu.instance_group = instance_group
        pu.save()
        return pu
    return fn


@pytest.fixture
def instance_group_jobs_running(instance_group, create_job_factory, create_project_update_factory):
    jobs_running = [create_job_factory(status='running') for i in xrange(0, 2)]
    project_updates_running = [create_project_update_factory(status='running') for i in xrange(0, 2)]
    return jobs_running + project_updates_running


@pytest.fixture
def instance_group_jobs_successful(instance_group, create_job_factory, create_project_update_factory):
    jobs_successful = [create_job_factory(status='successful') for i in xrange(0, 2)]
    project_updates_successful = [create_project_update_factory(status='successful') for i in xrange(0, 2)]
    return jobs_successful + project_updates_successful


@pytest.mark.django_db
def test_delete_instance_group_jobs(delete, instance_group_jobs_successful, instance_group, admin):
    url = reverse("api:instance_group_detail", kwargs={'pk': instance_group.pk})
    delete(url, None, admin, expect=204)


@pytest.mark.django_db
def test_delete_instance_group_jobs_running(delete, instance_group_jobs_running, instance_group_jobs_successful, instance_group, admin):
    def sort_keys(x):
        return (x['type'], x['id'])

    url = reverse("api:instance_group_detail", kwargs={'pk': instance_group.pk})
    response = delete(url, None, admin, expect=409)

    expect_transformed = [dict(id=str(j.id), type=j.model_to_str()) for j in instance_group_jobs_running]
    response_sorted = sorted(response.data['active_jobs'], key=sort_keys)
    expect_sorted = sorted(expect_transformed, key=sort_keys)

    assert response.data['error'] == u"Resource is being used by running jobs."
    assert response_sorted == expect_sorted


@pytest.mark.django_db
def test_delete_tower_instance_group_prevented(delete, options, tower_instance_group, user):
    url = reverse("api:instance_group_detail", kwargs={'pk': tower_instance_group.pk})
    super_user = user('bob', True)
    delete(url, None, super_user, expect=403)
    resp = options(url, None, super_user, expect=200)
    actions = ['GET', 'PUT',]
    assert 'DELETE' not in resp.data['actions']
    for action in actions:
        assert action in resp.data['actions']
