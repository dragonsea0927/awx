#!/usr/bin/python
# coding: utf-8 -*-

# Copyright: (c) 2017, Wayne Witzel III <wayne@riotousliving.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function
__metaclass__ = type


ANSIBLE_METADATA = {'metadata_version': '1.1',
                    'status': ['preview'],
                    'supported_by': 'community'}


DOCUMENTATION = '''
---
module: tower_credential
author: "Wayne Witzel III (@wwitzel3)"
version_added: "2.3"
short_description: create, update, or destroy Ansible Tower credential.
description:
    - Create, update, or destroy Ansible Tower credentials. See
      U(https://www.ansible.com/tower) for an overview.
options:
    name:
      description:
        - The name to use for the credential.
      required: True
    description:
      description:
        - The description to use for the credential.
    user:
      description:
        - User that should own this credential.
    team:
      description:
        - Team that should own this credential.
    project:
      description:
        - Project that should for this credential.
    organization:
      description:
        - Organization that should own the credential.
      required: True
    kind:
      description:
        - Type of credential being added.  The ssh choice refers to a Tower Machine credential.
      required: True
      choices: ["ssh", "vault", "net", "scm", "aws", "vmware", "satellite6", "cloudforms", "gce", "azure_rm", "openstack", "rhv", "insights", "tower"]
    host:
      description:
        - Host for this credential.
    username:
      description:
        - Username for this credential. access_key for AWS.
    password:
      description:
        - Password for this credential. Use ASK for prompting. secret_key for AWS. api_key for RAX.
    ssh_key_data:
      description:
        - SSH private key content. To extract the content from a file path, use the lookup function (see examples).
      required: False
    ssh_key_unlock:
      description:
        - Unlock password for ssh_key. Use ASK for prompting.
    authorize:
      description:
        - Should use authorize for net type.
      type: bool
      default: 'no'
    authorize_password:
      description:
        - Password for net credentials that require authorize.
    client:
      description:
        - Client or application ID for azure_rm type.
    security_token:
      description:
        - STS token for aws type.
      version_added: "2.6"
    secret:
      description:
        - Secret token for azure_rm type.
    subscription:
      description:
        - Subscription ID for azure_rm type.
    tenant:
      description:
        - Tenant ID for azure_rm type.
    domain:
      description:
        - Domain for openstack type.
    become_method:
      description:
        - Become method to Use for privledge escalation.
      choices: ["None", "sudo", "su", "pbrun", "pfexec", "pmrun"]
    become_username:
      description:
        - Become username. Use ASK for prompting.
    become_password:
      description:
        - Become password. Use ASK for prompting.
    vault_password:
      description:
        - Vault password. Use ASK for prompting.
    state:
      description:
        - Desired state of the resource.
      choices: ["present", "absent"]
      default: "present"
extends_documentation_fragment: tower
'''


EXAMPLES = '''
- name: Add tower credential
  tower_credential:
    name: Team Name
    description: Team Description
    organization: test-org
    kind: ssh
    state: present
    tower_config_file: "~/tower_cli.cfg"

- name: Create a valid SCM credential from a private_key file
  tower_credential:
    name: SCM Credential
    organization: Default
    state: present
    kind: scm
    username: joe
    password: secret
    ssh_key_data: "{{ lookup('file', '/tmp/id_rsa') }}"
    ssh_key_unlock: "passphrase"

- name: Add Credential Into Tower
  tower_credential:
    name: Workshop Credential
    ssh_key_data: "/home/{{ansible_user}}/.ssh/aws-private.pem"
    kind: ssh
    organization: Default
    tower_username: admin
    tower_password: ansible
    tower_host: https://localhost
  run_once: true
  delegate_to: localhost
'''

import os

from ansible.module_utils._text import to_text
from ansible.module_utils.ansible_tower import TowerModule, tower_auth_config, tower_check_mode

try:
    import tower_cli
    import tower_cli.exceptions as exc

    from tower_cli.conf import settings
except ImportError:
    pass


KIND_CHOICES = {
    'ssh': 'Machine',
    'vault': 'Ansible Vault',
    'net': 'Network',
    'scm': 'Source Control',
    'aws': 'Amazon Web Services',
    'vmware': 'VMware vCenter',
    'satellite6': 'Red Hat Satellite 6',
    'cloudforms': 'Red Hat CloudForms',
    'gce': 'Google Compute Engine',
    'azure_rm': 'Microsoft Azure Resource Manager',
    'openstack': 'OpenStack',
    'rhv': 'Red Hat Virtualization',
    'insights': 'Insights',
    'tower': 'Ansible Tower',
}


def credential_type_for_v1_kind(params, module):
    credential_type_res = tower_cli.get_resource('credential_type')
    kind = params.pop('kind')
    arguments = {'managed_by_tower': True}
    if kind == 'ssh':
        if params.get('vault_password'):
            arguments['kind'] = 'vault'
        else:
            arguments['kind'] = 'ssh'
    elif kind in ('net', 'scm', 'insights', 'vault'):
        arguments['kind'] = kind
    elif kind in KIND_CHOICES:
        arguments.update(dict(
            kind='cloud',
            name=KIND_CHOICES[kind]
        ))
    return credential_type_res.get(**arguments)


def main():

    argument_spec = dict(
        name=dict(required=True),
        user=dict(),
        team=dict(),
        kind=dict(required=True,
                  choices=KIND_CHOICES.keys()),
        host=dict(),
        username=dict(),
        password=dict(no_log=True),
        ssh_key_data=dict(no_log=True, type='str'),
        ssh_key_unlock=dict(no_log=True),
        authorize=dict(type='bool', default=False),
        authorize_password=dict(no_log=True),
        client=dict(),
        security_token=dict(),
        secret=dict(),
        tenant=dict(),
        subscription=dict(),
        domain=dict(),
        become_method=dict(),
        become_username=dict(),
        become_password=dict(no_log=True),
        vault_password=dict(no_log=True),
        description=dict(),
        organization=dict(required=True),
        project=dict(),
        state=dict(choices=['present', 'absent'], default='present'),
    )

    module = TowerModule(argument_spec=argument_spec, supports_check_mode=True)

    name = module.params.get('name')
    organization = module.params.get('organization')
    state = module.params.get('state')

    json_output = {'credential': name, 'state': state}

    tower_auth = tower_auth_config(module)
    with settings.runtime_values(**tower_auth):
        tower_check_mode(module)
        credential = tower_cli.get_resource('credential')
        try:
            params = {}
            params['create_on_missing'] = True
            params['name'] = name

            if organization:
                org_res = tower_cli.get_resource('organization')
                org = org_res.get(name=organization)
                params['organization'] = org['id']

            try:
                tower_cli.get_resource('credential_type')
            except (ImportError, AttributeError):
                # /api/v1/ backwards compat
                # older versions of tower-cli don't *have* a credential_type
                # resource
                params['kind'] = module.params['kind']
            else:
                credential_type = credential_type_for_v1_kind(module.params, module)
                params['credential_type'] = credential_type['id']

            if module.params.get('description'):
                params['description'] = module.params.get('description')

            if module.params.get('user'):
                user_res = tower_cli.get_resource('user')
                user = user_res.get(username=module.params.get('user'))
                params['user'] = user['id']

            if module.params.get('team'):
                team_res = tower_cli.get_resource('team')
                team = team_res.get(name=module.params.get('team'))
                params['team'] = team['id']

            if module.params.get('ssh_key_data'):
                data = module.params.get('ssh_key_data')
                if os.path.exists(data):
                    module.deprecate(
                        msg='ssh_key_data should be a string, not a path to a file. Use lookup(\'file\', \'/path/to/file\') instead',
                        version="2.12"
                    )
                    if os.path.isdir(data):
                        module.fail_json(msg='attempted to read contents of directory: %s' % data)
                    with open(data, 'rb') as f:
                        module.params['ssh_key_data'] = to_text(f.read())
                else:
                    module.params['ssh_key_data'] = data

            for key in ('authorize', 'authorize_password', 'client',
                        'security_token', 'secret', 'tenant', 'subscription',
                        'domain', 'become_method', 'become_username',
                        'become_password', 'vault_password', 'project', 'host',
                        'username', 'password', 'ssh_key_data',
                        'ssh_key_unlock'):
                if 'kind' in params:
                    params[key] = module.params.get(key)
                elif module.params.get(key):
                    params.setdefault('inputs', {})[key] = module.params.get(key)

            if state == 'present':
                result = credential.modify(**params)
                json_output['id'] = result['id']
            elif state == 'absent':
                result = credential.delete(**params)
        except (exc.NotFound) as excinfo:
            module.fail_json(msg='Failed to update credential, organization not found: {0}'.format(excinfo), changed=False)
        except (exc.ConnectionError, exc.BadRequest, exc.NotFound) as excinfo:
            module.fail_json(msg='Failed to update credential: {0}'.format(excinfo), changed=False)

    json_output['changed'] = result['changed']
    module.exit_json(**json_output)


if __name__ == '__main__':
    main()
