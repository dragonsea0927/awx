# Generated by Django 2.2.16 on 2021-02-18 22:57

import awx.main.fields
from django.db import migrations
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0127_reset_pod_spec_override'),
    ]

    operations = [
        migrations.AlterField(
            model_name='organization',
            name='read_role',
            field=awx.main.fields.ImplicitRoleField(editable=False, null='True', on_delete=django.db.models.deletion.CASCADE, parent_role=['member_role', 'auditor_role', 'execute_role', 'project_admin_role', 'inventory_admin_role', 'workflow_admin_role', 'notification_admin_role', 'credential_admin_role', 'job_template_admin_role', 'approval_role', 'execution_environment_admin_role'], related_name='+', to='main.Role'),
        ),
    ]
