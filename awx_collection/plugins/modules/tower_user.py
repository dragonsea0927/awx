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
module: tower_user
author: "Wayne Witzel III (@wwitzel3)"
version_added: "2.3"
short_description: create, update, or destroy Ansible Tower user.
description:
    - Create, update, or destroy Ansible Tower users. See
      U(https://www.ansible.com/tower) for an overview.
options:
    username:
      description:
        - The username of the user.
      required: True
      type: str
    first_name:
      description:
        - First name of the user.
      type: str
    last_name:
      description:
        - Last name of the user.
      type: str
    email:
      description:
        - Email address of the user.
      required: True
      type: str
    password:
      description:
        - Password of the user.
      type: str
    superuser:
      description:
        - User is a system wide administrator.
      type: bool
      default: 'no'
    auditor:
      description:
        - User is a system wide auditor.
      type: bool
      default: 'no'
    state:
      description:
        - Desired state of the resource.
      default: "present"
      choices: ["present", "absent"]
      type: str

extends_documentation_fragment: awx.awx.auth
'''


EXAMPLES = '''
- name: Add tower user
  tower_user:
    username: jdoe
    password: foobarbaz
    email: jdoe@example.org
    first_name: John
    last_name: Doe
    state: present
    tower_config_file: "~/tower_cli.cfg"

- name: Add tower user as a system administrator
  tower_user:
    username: jdoe
    password: foobarbaz
    email: jdoe@example.org
    superuser: yes
    state: present
    tower_config_file: "~/tower_cli.cfg"

- name: Add tower user as a system auditor
  tower_user:
    username: jdoe
    password: foobarbaz
    email: jdoe@example.org
    auditor: yes
    state: present
    tower_config_file: "~/tower_cli.cfg"

- name: Delete tower user
  tower_user:
    username: jdoe
    email: jdoe@example.org
    state: absent
    tower_config_file: "~/tower_cli.cfg"
'''

from ..module_utils.tower_api import TowerModule

def main():
    # Any additional arguments that are not fields of the item can be added here
    argument_spec = dict(
        username=dict(required=True),
        first_name=dict(),
        last_name=dict(),
        password=dict(no_log=True),
        email=dict(required=True),
        superuser=dict(type='bool', default=False),
        auditor=dict(type='bool', default=False),
        state=dict(choices=['present', 'absent'], default='present'),
    )

    # Create a module for ourselves
    module = TowerModule(argument_spec=argument_spec, supports_check_mode=True)

    # Extract our parameters
    state = module.params.get('state')
    user_fields = {
        'username': module.params.get('username'),
        'first_name': module.params.get('first_name'),
        'last_name': module.params.get('last_name'),
        'password': module.params.get('password'),
        'email': module.params.get('email'),
        'superuser': module.params.get('superuser'),
        'auditor': module.params.get('auditor'),
    }

    # Attempt to lookup team based on the provided name and org ID
    user = module.get_one('users', **{
        'data': {
            'username': user_fields['username'],
        }
    })

    if state == 'absent' and not user:
        # If the state was absent and we had no user, we can just return
        module.exit_json(**module.json_output)
    elif state == 'absent' and user:
        # If the state was absent and we had a user, we can try to delete it, the module will handle exiting from this
        module.delete_endpoint('users/{0}'.format(user['id']), item_type='user', item_name=user_fields['username'], **{})
    elif state == 'present' and not user:
        # if the state was present and we couldn't find a user we can build one, the module wikl handle exiting from this
        module.post_endpoint('users', item_type='user', item_name=user_fields['username'], **{
            'data': user_fields
        })
    else:
        # If the state was present and we had a user we can see if we need to update it
        # This will return on its own
        module.update_if_needed(user, user_fields)

if __name__ == '__main__':
    main()
