import pytest

from awx.main.models import JobTemplate, Job


@pytest.mark.django_db
def test_awx_virtualenv_from_settings(inventory, project, machine_credential):
    jt = JobTemplate.objects.create(
        name='my-jt',
        inventory=inventory,
        project=project,
        playbook='helloworld.yml'
    )
    jt.credentials.add(machine_credential)
    job = jt.create_unified_job()
    assert job.ansible_virtualenv_path == '/venv/ansible'


@pytest.mark.django_db
def test_awx_custom_virtualenv(inventory, project, machine_credential):
    jt = JobTemplate.objects.create(
        name='my-jt',
        inventory=inventory,
        project=project,
        playbook='helloworld.yml'
    )
    jt.credentials.add(machine_credential)
    job = jt.create_unified_job()

    job.project.organization.custom_virtualenv = '/venv/fancy-org'
    job.project.organization.save()
    assert job.ansible_virtualenv_path == '/venv/fancy-org'

    job.project.custom_virtualenv = '/venv/fancy-proj'
    job.project.save()
    assert job.ansible_virtualenv_path == '/venv/fancy-proj'

    job.job_template.custom_virtualenv = '/venv/fancy-jt'
    job.job_template.save()
    assert job.ansible_virtualenv_path == '/venv/fancy-jt'


@pytest.mark.django_db
def test_awx_custom_virtualenv_without_jt(project):
    project.custom_virtualenv = '/venv/fancy-proj'
    project.save()
    job = Job(project=project)
    job.save()

    job = Job.objects.get(pk=job.id)
    assert job.ansible_virtualenv_path == '/venv/fancy-proj'
