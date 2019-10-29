# AWX Ansible Collection

This Ansible collection allows for easy interaction with an AWX or Ansible Tower
server in Ansible playbooks.

The previous home for this collection was in https://github.com/ansible/ansible
inside the folder `lib/ansible/modules/web_infrastructure/ansible_tower`
as well as other folders for the inventory plugin, module utils, and
doc fragment.

## Release and Upgrade Notes

The release 7.0.0 of the `awx.awx` collection is intended to be identical
to the content prior to the migration, aside from changes necessary to
have it function as a collection.

The following notes are changes that may require changes to playbooks.

 - Specifying `inputs` or `injectors` as strings in the
   `tower_credential_type` module is no longer supported. Provide as dictionaries instead.

## Running

To use this collection, the "old" tower-cli needs to be installed
in the virtual environment where the collection runs.
You can install it from either:

 - https://github.com/ansible/tower-cli/
 - https://pypi.org/project/ansible-tower-cli/

To use this collection in AWX, you should create a custom virtual environment
to install the requirement into. NOTE: running locally, you will also need
to set the job template extra_vars to include `ansible_python_interpreter`
to be the python in that virtual environment.

## Running Tests

Tests to verify compatibility with the most recent AWX code are
in `awx_collection/test/awx`. These tests require that python packages
are available for all of `awx`, `ansible`, `tower_cli`, and the collection
itself.

The target `make prepare_collection_venv` will prepare some requirements
in the `awx_collection_test_venv` folder so that `make test_collection` can
be ran to actually run the tests. A single test can be ran via:

```
make test_collection COLLECTION_TEST_DIRS=awx_collection/test/awx/test_organization.py
```

## Building

The build target `make build_collection` will template out a `galaxy.yml` file
with automatic detection of the current AWX version. Then it builds the
collection with the `ansible-galaxy` CLI.

## Roadmap

Major future development items on the agenda include:

 - Removing tower-cli as a dependency
 - Renaming the modules, for example `tower_organization` to just `organization`
   and giving a deprecation period for the switch

## Licensing

All content in this folder is licensed under the same license as Ansible,
which is the same as license that applied before the split into an
independent collection.
