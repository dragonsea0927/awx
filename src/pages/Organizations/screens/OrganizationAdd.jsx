import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { I18n, i18nMark } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  PageSection,
  Form,
  FormGroup,
  TextInput,
  Gallery,
  Card,
  CardBody,
} from '@patternfly/react-core';

import { ConfigContext } from '../../../context';
import Lookup from '../../../components/Lookup';
import AnsibleSelect from '../../../components/AnsibleSelect';
import FormActionGroup from '../../../components/FormActionGroup';

class OrganizationAdd extends React.Component {
  constructor (props) {
    super(props);

    this.getInstanceGroups = this.getInstanceGroups.bind(this);
    this.onFieldChange = this.onFieldChange.bind(this);
    this.onLookupSave = this.onLookupSave.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onSuccess = this.onSuccess.bind(this);

    this.state = {
      name: '',
      description: '',
      custom_virtualenv: '',
      instanceGroups: [],
      error: '',
      defaultEnv: '/venv/ansible/',
    };
  }

  onFieldChange (val, evt) {
    this.setState({ [evt.target.name]: val || evt.target.value });
  }

  onLookupSave (val, targetName) {
    this.setState({ [targetName]: val });
  }

  async onSubmit () {
    const { api } = this.props;
    const { name, description, custom_virtualenv, instanceGroups } = this.state;
    const data = {
      name,
      description,
      custom_virtualenv
    };
    try {
      const { data: response } = await api.createOrganization(data);
      const instanceGroupsUrl = response.related.instance_groups;
      try {
        if (instanceGroups.length > 0) {
          instanceGroups.forEach(async (select) => {
            await api.createInstanceGroups(instanceGroupsUrl, select.id);
          });
        }
      } catch (err) {
        this.setState({ error: err });
      } finally {
        this.onSuccess(response.id);
      }
    } catch (err) {
      this.setState({ error: err });
    }
  }

  onCancel () {
    const { history } = this.props;
    history.push('/organizations');
  }

  onSuccess (id) {
    const { history } = this.props;
    history.push(`/organizations/${id}`);
  }

  async getInstanceGroups (params) {
    const { api } = this.props;
    const data = await api.getInstanceGroups(params);
    return data;
  }

  render () {
    const {
      name,
      description,
      custom_virtualenv,
      defaultEnv,
      instanceGroups,
      error
    } = this.state;
    const enabled = name.length > 0; // TODO: add better form validation
    const instanceGroupsLookupColumns = [
      { name: i18nMark('Name'), key: 'name', isSortable: true },
      { name: i18nMark('Modified'), key: 'modified', isSortable: false, isNumeric: true },
      { name: i18nMark('Created'), key: 'created', isSortable: false, isNumeric: true }
    ];

    return (
      <PageSection>
        <Card>
          <CardBody>
            <Form autoComplete="off">
              <I18n>
                {({ i18n }) => (
                  <Gallery gutter="md">
                    <FormGroup
                      label={i18n._(t`Name`)}
                      isRequired
                      fieldId="add-org-form-name"
                    >
                      <TextInput
                        isRequired
                        id="add-org-form-name"
                        name="name"
                        value={name}
                        onChange={this.onFieldChange}
                      />
                    </FormGroup>
                    <FormGroup label={i18n._(t`Description`)} fieldId="add-org-form-description">
                      <TextInput
                        id="add-org-form-description"
                        name="description"
                        value={description}
                        onChange={this.onFieldChange}
                      />
                    </FormGroup>
                    <FormGroup label={i18n._(t`Instance Groups`)} fieldId="add-org-form-instance-groups">
                      <Lookup
                        lookupHeader={i18n._(t`Instance Groups`)}
                        name="instanceGroups"
                        value={instanceGroups}
                        onLookupSave={this.onLookupSave}
                        getItems={this.getInstanceGroups}
                        columns={instanceGroupsLookupColumns}
                        sortedColumnKey="name"
                      />
                    </FormGroup>
                    <ConfigContext.Consumer>
                      {({ custom_virtualenvs }) => (
                        custom_virtualenvs && custom_virtualenvs.length > 1 && (
                          <FormGroup label={i18n._(t`Ansible Environment`)} fieldId="add-org-custom-virtualenv">
                            <AnsibleSelect
                              label={i18n._(t`Ansible Environment`)}
                              name="custom_virtualenv"
                              value={custom_virtualenv}
                              onChange={this.onFieldChange}
                              data={custom_virtualenvs}
                              defaultSelected={defaultEnv}
                            />
                          </FormGroup>
                        )
                      )}
                    </ConfigContext.Consumer>
                  </Gallery>
                )}
              </I18n>
              <FormActionGroup
                onSubmit={this.onSubmit}
                submitDisabled={!enabled}
                onCancel={this.onCancel}
              />
              {error ? <div>error</div> : ''}
            </Form>
          </CardBody>
        </Card>
      </PageSection>
    );
  }
}

OrganizationAdd.contextTypes = {
  custom_virtualenvs: PropTypes.arrayOf(PropTypes.string)
};

export default withRouter(OrganizationAdd);
