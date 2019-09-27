#!/usr/bin/python
#coding: utf-8 -*-

# (c) 2017, Wayne Witzel III <wayne@riotousliving.com>
#
# This module is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This software is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this software.  If not, see <http://www.gnu.org/licenses/>.

DOCUMENTATION = '''
---
module: tower_organization
version_added: "2.3"
short_description: create, update, or destroy Ansible Tower organizations
description:
    - Create, update, or destroy Ansible Tower organizations. See
      U(https://www.ansible.com/tower) for an overview.
options:
    name:
      description:
        - Name to use for the organization.
      required: True
    description:
      description:
        - The description to use for the organization.
      required: False
      default: null
    state:
      description:
        - Desired state of the resource.
      required: False
      default: "present"
      choices: ["present", "absent"]
    host:
      description:
        - URL to your Tower instance.
      required: False
      default: null
    username:
        description:
          - Username for your Tower instance.
        required: False
        default: null
    password:
        description:
          - Password for your Tower instance.
        required: False
        default: null
    verify_ssl:
        description:
          - Dis/allow insecure connections to Tower. If C(no), SSL certificates will not be validated.
            This should only be used on personally controlled sites using self-signed certificates.
        required: False
        default: 'yes'
    tower_config_file:
      description:
        - Path to the Tower config file. See notes.
      required: False
      default: null


requirements:
  - "python >= 2.6"
  - "ansible-tower-cli >= 3.0.3"

notes:
  - If no I(tower_config_file) is provided we will attempt to use the tower-cli library
    defaults to find your Tower host information.
  - I(tower_config_file) should contain Tower configuration in the following format
      host=hostname
      username=username
      password=password
'''


EXAMPLES = '''
  - tasks
    - name: Create organization
      tower_organization:
          name: "Foo"
          description: "Foo bar organization"
          state: present
          tower_config_file: "~/tower_cli.cfg"
'''

import os

try:
    import tower_cli
    import tower_cli.utils.exceptions as exc

    from tower_cli.conf import settings
    from ansible.module_utils.ansible_tower import tower_auth_config, tower_check_mode

    HAS_TOWER_CLI = True
except ImportError:
    HAS_TOWER_CLI = False


def main():
    module = AnsibleModule(
        argument_spec = dict(
            name = dict(required=True),
            description = dict(),
            host = dict(),
            username = dict(),
            password = dict(no_log=True),
            verify_ssl = dict(type='bool', default='yes'),
            tower_config_file = dict(type='path'),
            state = dict(choices=['present', 'absent'], default='present'),
        ),
        supports_check_mode=True
    )

    if not HAS_TOWER_CLI:
        module.fail_json(msg='ansible-tower-cli required for this module')

    name = module.params.get('name')
    description = module.params.get('description')
    state = module.params.get('state')

    json_output = {'organization': name, 'state': state}

    tower_auth = tower_auth_config(module)
    with settings.runtime_values(**tower_auth):
        tower_check_mode(module)
        organization = tower_cli.get_resource('organization')
        try:
            if state == 'present':
                result = organization.modify(name=name, description=description, create_on_missing=True)
                json_output['id'] = result['id']
            elif state == 'absent':
                result = organization.delete(name=name)
        except (exc.ConnectionError, exc.BadRequest) as excinfo:
            module.fail_json(msg='Failed to update the organization: {0}'.format(excinfo), changed=False)

    json_output['changed'] = result['changed']
    module.exit_json(**json_output)


from ansible.module_utils.basic import AnsibleModule
if __name__ == '__main__':
    main()
