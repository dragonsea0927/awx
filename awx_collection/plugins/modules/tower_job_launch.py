#!/usr/bin/python
# coding: utf-8 -*-

# (c) 2017, Wayne Witzel III <wayne@riotousliving.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function
__metaclass__ = type


ANSIBLE_METADATA = {'metadata_version': '1.1',
                    'status': ['preview'],
                    'supported_by': 'community'}


DOCUMENTATION = '''
---
module: tower_job_launch
author: "Wayne Witzel III (@wwitzel3)"
version_added: "2.3"
short_description: Launch an Ansible Job.
description:
    - Launch an Ansible Tower jobs. See
      U(https://www.ansible.com/tower) for an overview.
options:
    job_template:
      description:
        - Name of the job template to use.
      required: True
      type: str
    job_type:
      description:
        - Job_type to use for the job, only used if prompt for job_type is set.
      choices: ["run", "check"]
      type: str
    inventory:
      description:
        - Inventory to use for the job, only used if prompt for inventory is set.
      type: str
    credential:
      description:
        - Credential to use for job, only used if prompt for credential is set.
      type: str
    extra_vars:
      description:
        - extra_vars to use for the Job Template. Prepend C(@) if a file.
        - ask_extra_vars needs to be set to True via tower_job_template module
          when creating the Job Template.
      type: dict
    limit:
      description:
        - Limit to use for the I(job_template).
      type: str
    tags:
      description:
        - Specific tags to use for from playbook.
      type: list
extends_documentation_fragment: awx.awx.auth
'''

EXAMPLES = '''
# Launch a job template
- name: Launch a job
  tower_job_launch:
    job_template: "My Job Template"
  register: job

- name: Wait for job max 120s
  tower_job_wait:
    job_id: "{{ job.id }}"
    timeout: 120

- name: Launch a job template with extra_vars on remote Tower instance
  tower_job_launch:
    job_template: "My Job Template"
    extra_vars:
      var1: "My First Variable"
      var2: "My Second Variable"
      var3: "My Third Variable"
    job_type: run

# Launch job template with inventory and credential for prompt on launch
- name: Launch a job with inventory and credential
  tower_job_launch:
    job_template: "My Job Template"
    inventory: "My Inventory"
    credential: "My Credential"
  register: job
- name: Wait for job max 120s
  tower_job_wait:
    job_id: "{{ job.id }}"
    timeout: 120
'''

RETURN = '''
id:
    description: job id of the newly launched job
    returned: success
    type: int
    sample: 86
status:
    description: status of newly launched job
    returned: success
    type: str
    sample: pending
'''

import json

from ..module_utils.ansible_tower import TowerModule, tower_auth_config, tower_check_mode

try:
    import tower_cli
    import tower_cli.exceptions as exc

    from tower_cli.conf import settings
except ImportError:
    pass


def update_fields(module, p):
    params = p.copy()

    params_update = {}
    job_template = params.get('job_template')
    extra_vars = params.get('extra_vars')
    try:
        job_template_to_launch = tower_cli.get_resource('job_template').get(name=job_template)
    except (exc.NotFound) as excinfo:
        module.fail_json(msg='Unable to launch job, job_template/{0} was not found: {1}'.format(job_template, excinfo), changed=False)

    ask_extra_vars = job_template_to_launch['ask_variables_on_launch']
    survey_enabled = job_template_to_launch['survey_enabled']

    if extra_vars and (ask_extra_vars or survey_enabled):
        params_update['extra_vars'] = [json.dumps(extra_vars)]

    elif extra_vars:
        module.fail_json(msg="extra_vars is set on launch but the Job Template does not have ask_extra_vars or survey_enabled set to True.")

    params.update(params_update)
    return params


def main():
    argument_spec = dict(
        job_template=dict(required=True, type='str'),
        job_type=dict(choices=['run', 'check']),
        inventory=dict(type='str', default=None),
        credential=dict(type='str', default=None),
        limit=dict(),
        tags=dict(type='list'),
        extra_vars=dict(type='dict', required=False),
    )

    module = TowerModule(
        argument_spec=argument_spec,
        supports_check_mode=True
    )

    json_output = {}
    tags = module.params.get('tags')

    tower_auth = tower_auth_config(module)
    with settings.runtime_values(**tower_auth):
        tower_check_mode(module)
        try:
            params = module.params.copy()
            if isinstance(tags, list):
                params['tags'] = ','.join(tags)
            job = tower_cli.get_resource('job')

            params = update_fields(module, params)

            lookup_fields = ('job_template', 'inventory', 'credential')
            for field in lookup_fields:
                try:
                    name = params.pop(field)
                    if name:
                        result = tower_cli.get_resource(field).get(name=name)
                        params[field] = result['id']
                except exc.NotFound as excinfo:
                    module.fail_json(msg='Unable to launch job, {0}/{1} was not found: {2}'.format(field, name, excinfo), changed=False)

            result = job.launch(no_input=True, **params)
            json_output['id'] = result['id']
            json_output['status'] = result['status']
        except (exc.ConnectionError, exc.BadRequest, exc.AuthError) as excinfo:
            module.fail_json(msg='Unable to launch job: {0}'.format(excinfo), changed=False)

    json_output['changed'] = result['changed']
    module.exit_json(**json_output)


if __name__ == '__main__':
    main()
