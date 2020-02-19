/* eslint no-nested-ternary: 0 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik, useField } from 'formik';
import { Config } from '@contexts/Config';
import { Form, FormGroup, Title } from '@patternfly/react-core';
import AnsibleSelect from '@components/AnsibleSelect';
import ContentError from '@components/ContentError';
import ContentLoading from '@components/ContentLoading';
import FormActionGroup from '@components/FormActionGroup/FormActionGroup';
import FormField, {
  FieldTooltip,
  FormSubmitError,
} from '@components/FormField';
import OrganizationLookup from '@components/Lookup/OrganizationLookup';
import { CredentialTypesAPI, ProjectsAPI } from '@api';
import { required } from '@util/validators';
import { FormColumnLayout, SubFormLayout } from '@components/FormLayout';
import {
  GitSubForm,
  HgSubForm,
  SvnSubForm,
  InsightsSubForm,
  ManualSubForm,
} from './ProjectSubForms';

const fetchCredentials = async credential => {
  const [
    {
      data: {
        results: [scmCredentialType],
      },
    },
    {
      data: {
        results: [insightsCredentialType],
      },
    },
  ] = await Promise.all([
    CredentialTypesAPI.read({ kind: 'scm' }),
    CredentialTypesAPI.read({ name: 'Insights' }),
  ]);

  if (!credential) {
    return {
      scm: { typeId: scmCredentialType.id },
      insights: { typeId: insightsCredentialType.id },
    };
  }

  const { credential_type_id } = credential;
  return {
    scm: {
      typeId: scmCredentialType.id,
      value: credential_type_id === scmCredentialType.id ? credential : null,
    },
    insights: {
      typeId: insightsCredentialType.id,
      value:
        credential_type_id === insightsCredentialType.id ? credential : null,
    },
  };
};

function ProjectFormFields({
  project_base_dir,
  project_local_paths,
  formik,
  i18n,
  setCredentials,
  credentials,
  scmTypeOptions,
  setScmSubFormState,
  scmSubFormState,
  setOrganization,
  organization,
}) {
  const scmFormFields = {
    scm_url: '',
    scm_branch: '',
    scm_refspec: '',
    credential: '',
    scm_clean: false,
    scm_delete_on_update: false,
    scm_update_on_launch: false,
    allow_override: false,
    scm_update_cache_timeout: 0,
  };

  const [scmTypeField, scmTypeMeta, scmTypeHelpers] = useField({
    name: 'scm_type',
    validate: required(i18n._(t`Set a value for this field`), i18n),
  });
  const [venvField] = useField('custom_virtualenv');
  const orgFieldArr = useField({
    name: 'organization',
    validate: required(i18n._(t`Select a value for this field`), i18n),
  });
  const organizationMeta = orgFieldArr[1];
  const organizationHelpers = orgFieldArr[2];

  /* Save current scm subform field values to state */
  const saveSubFormState = form => {
    const currentScmFormFields = { ...scmFormFields };

    Object.keys(currentScmFormFields).forEach(label => {
      currentScmFormFields[label] = form.values[label];
    });

    setScmSubFormState(currentScmFormFields);
  };

  /**
   * If scm type is !== the initial scm type value,
   * reset scm subform field values to defaults.
   * If scm type is === the initial scm type value,
   * reset scm subform field values to scmSubFormState.
   */
  const resetScmTypeFields = (value, form) => {
    if (form.values.scm_type === form.initialValues.scm_type) {
      saveSubFormState(formik);
    }

    Object.keys(scmFormFields).forEach(label => {
      if (value === form.initialValues.scm_type) {
        form.setFieldValue(label, scmSubFormState[label]);
      } else {
        form.setFieldValue(label, scmFormFields[label]);
      }
      form.setFieldTouched(label, false);
    });
  };

  const handleCredentialSelection = (type, value) => {
    setCredentials({
      ...credentials,
      [type]: {
        ...credentials[type],
        value,
      },
    });
  };

  return (
    <>
      <FormField
        id="project-name"
        label={i18n._(t`Name`)}
        name="name"
        type="text"
        validate={required(null, i18n)}
        isRequired
      />
      <FormField
        id="project-description"
        label={i18n._(t`Description`)}
        name="description"
        type="text"
      />
      <OrganizationLookup
        helperTextInvalid={organizationMeta.error}
        isValid={!organizationMeta.touched || !organizationMeta.error}
        onBlur={() => organizationHelpers.setTouched()}
        onChange={value => {
          organizationHelpers.setValue(value.id);
          setOrganization(value);
        }}
        value={organization}
        required
      />
      <FormGroup
        fieldId="project-scm-type"
        helperTextInvalid={scmTypeMeta.error}
        isRequired
        isValid={!scmTypeMeta.touched || !scmTypeMeta.error}
        label={i18n._(t`SCM Type`)}
      >
        <AnsibleSelect
          {...scmTypeField}
          id="scm_type"
          data={[
            {
              value: '',
              key: '',
              label: i18n._(t`Choose an SCM Type`),
              isDisabled: true,
            },
            ...scmTypeOptions.map(([value, label]) => {
              if (label === 'Manual') {
                value = 'manual';
              }
              return {
                label,
                value,
                key: value,
              };
            }),
          ]}
          onChange={(event, value) => {
            scmTypeHelpers.setValue(value);
            resetScmTypeFields(value, formik);
          }}
        />
      </FormGroup>
      {formik.values.scm_type !== '' && (
        <SubFormLayout>
          <Title size="md">{i18n._(t`Type Details`)}</Title>
          <FormColumnLayout>
            {
              {
                manual: (
                  <ManualSubForm
                    localPath={formik.initialValues.local_path}
                    project_base_dir={project_base_dir}
                    project_local_paths={project_local_paths}
                  />
                ),
                git: (
                  <GitSubForm
                    credential={credentials.scm}
                    onCredentialSelection={handleCredentialSelection}
                    scmUpdateOnLaunch={formik.values.scm_update_on_launch}
                  />
                ),
                hg: (
                  <HgSubForm
                    credential={credentials.scm}
                    onCredentialSelection={handleCredentialSelection}
                    scmUpdateOnLaunch={formik.values.scm_update_on_launch}
                  />
                ),
                svn: (
                  <SvnSubForm
                    credential={credentials.scm}
                    onCredentialSelection={handleCredentialSelection}
                    scmUpdateOnLaunch={formik.values.scm_update_on_launch}
                  />
                ),
                insights: (
                  <InsightsSubForm
                    credential={credentials.insights}
                    onCredentialSelection={handleCredentialSelection}
                    scmUpdateOnLaunch={formik.values.scm_update_on_launch}
                  />
                ),
              }[formik.values.scm_type]
            }
          </FormColumnLayout>
        </SubFormLayout>
      )}
      <Config>
        {({ custom_virtualenvs }) =>
          custom_virtualenvs &&
          custom_virtualenvs.length > 1 && (
            <FormGroup
              fieldId="project-custom-virtualenv"
              label={i18n._(t`Ansible Environment`)}
            >
              <FieldTooltip
                content={i18n._(t`Select the playbook to be executed by
                this job.`)}
              />
              <AnsibleSelect
                id="project-custom-virtualenv"
                data={[
                  {
                    label: i18n._(t`Use Default Ansible Environment`),
                    value: '/venv/ansible/',
                    key: 'default',
                  },
                  ...custom_virtualenvs
                    .filter(datum => datum !== '/venv/ansible/')
                    .map(datum => ({
                      label: datum,
                      value: datum,
                      key: datum,
                    })),
                ]}
                {...venvField}
              />
            </FormGroup>
          )
        }
      </Config>
    </>
  );
}

function ProjectForm({ i18n, project, submitError, ...props }) {
  const { handleCancel, handleSubmit } = props;
  const { summary_fields = {} } = project;
  const [contentError, setContentError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [scmSubFormState, setScmSubFormState] = useState(null);
  const [scmTypeOptions, setScmTypeOptions] = useState(null);
  const [credentials, setCredentials] = useState({
    scm: { typeId: null, value: null },
    insights: { typeId: null, value: null },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const credentialResponse = fetchCredentials(summary_fields.credential);
        const {
          data: {
            actions: {
              GET: {
                scm_type: { choices },
              },
            },
          },
        } = await ProjectsAPI.readOptions();

        setCredentials(await credentialResponse);
        setScmTypeOptions(choices);
      } catch (error) {
        setContentError(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [summary_fields.credential]);

  if (isLoading) {
    return <ContentLoading />;
  }

  if (contentError) {
    return <ContentError error={contentError} />;
  }

  return (
    <Config>
      {({ project_base_dir, project_local_paths }) => (
        <Formik
          initialValues={{
            allow_override: project.allow_override || false,
            base_dir: project_base_dir || '',
            credential: project.credential || '',
            custom_virtualenv: project.custom_virtualenv || '',
            description: project.description || '',
            local_path: project.local_path || '',
            name: project.name || '',
            organization: project.organization || '',
            scm_branch: project.scm_branch || '',
            scm_clean: project.scm_clean || false,
            scm_delete_on_update: project.scm_delete_on_update || false,
            scm_refspec: project.scm_refspec || '',
            scm_type:
              project.scm_type === ''
                ? 'manual'
                : project.scm_type === undefined
                ? ''
                : project.scm_type,
            scm_update_cache_timeout: project.scm_update_cache_timeout || 0,
            scm_update_on_launch: project.scm_update_on_launch || false,
            scm_url: project.scm_url || '',
          }}
          onSubmit={handleSubmit}
        >
          {formik => (
            <Form autoComplete="off" onSubmit={formik.handleSubmit}>
              <FormColumnLayout>
                <ProjectFormFields
                  project_base_dir={project_base_dir}
                  project_local_paths={project_local_paths}
                  formik={formik}
                  i18n={i18n}
                  setCredentials={setCredentials}
                  credentials={credentials}
                  scmTypeOptions={scmTypeOptions}
                  setScmSubFormState={setScmSubFormState}
                  scmSubFormState={scmSubFormState}
                  setOrganization={setOrganization}
                  organization={organization}
                />
                <FormSubmitError error={submitError} />
                <FormActionGroup
                  onCancel={handleCancel}
                  onSubmit={formik.handleSubmit}
                />
              </FormColumnLayout>
            </Form>
          )}
        </Formik>
      )}
    </Config>
  );
}

ProjectForm.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  project: PropTypes.shape({}),
  submitError: PropTypes.shape({}),
};

ProjectForm.defaultProps = {
  project: {},
  submitError: null,
};

export default withI18n()(ProjectForm);
