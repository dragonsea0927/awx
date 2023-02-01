# Generated by Django 2.2.4 on 2019-09-11 13:44

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('main', '0090_v360_WFJT_prompts'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='notification_templates_approvals',
            field=models.ManyToManyField(blank=True, related_name='organization_notification_templates_for_approvals', to='main.NotificationTemplate'),
        ),
        migrations.AddField(
            model_name='workflowjobtemplate',
            name='notification_templates_approvals',
            field=models.ManyToManyField(blank=True, related_name='workflowjobtemplate_notification_templates_for_approvals', to='main.NotificationTemplate'),
        ),
        migrations.AlterField(
            model_name='workflowjobnode',
            name='do_not_run',
            field=models.BooleanField(
                default=False,
                help_text='Indicates that a job will not be created when True. Workflow runtime semantics will mark this True if the node is in a path that will decidedly not be ran. A value of False means the node may not run.',
            ),
        ),
    ]
