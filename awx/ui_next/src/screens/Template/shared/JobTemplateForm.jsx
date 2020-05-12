import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { withFormik, useField, useFormikContext } from 'formik';
import {
  Form,
  FormGroup,
  Switch,
  Checkbox,
  TextInput,
} from '@patternfly/react-core';
import ContentError from '../../../components/ContentError';
import ContentLoading from '../../../components/ContentLoading';
import AnsibleSelect from '../../../components/AnsibleSelect';
import { TagMultiSelect } from '../../../components/MultiSelect';
import useRequest from '../../../util/useRequest';

import FormActionGroup from '../../../components/FormActionGroup';
import FormField, {
  CheckboxField,
  FieldTooltip,
  FormSubmitError,
} from '../../../components/FormField';
import FieldWithPrompt from '../../../components/FieldWithPrompt';
import {
  FormColumnLayout,
  FormFullWidthLayout,
  FormCheckboxLayout,
} from '../../../components/FormLayout';
import { VariablesField } from '../../../components/CodeMirrorInput';
import { required } from '../../../util/validators';
import { JobTemplate } from '../../../types';
import {
  InventoryLookup,
  InstanceGroupsLookup,
  ProjectLookup,
  MultiCredentialsLookup,
} from '../../../components/Lookup';
import { JobTemplatesAPI, ProjectsAPI } from '../../../api';
import LabelSelect from './LabelSelect';
import PlaybookSelect from './PlaybookSelect';
import WebhookSubForm from './WebhookSubForm';

const { origin } = document.location;

function JobTemplateForm({
  template,
  validateField,
  handleCancel,
  handleSubmit,
  setFieldValue,
  submitError,
  i18n,
}) {
  const [contentError, setContentError] = useState(false);
  const [project, setProject] = useState(template?.summary_fields?.project);
  const [inventory, setInventory] = useState(
    template?.summary_fields?.inventory
  );
  const [allowCallbacks, setAllowCallbacks] = useState(
    Boolean(template?.host_config_key)
  );

  const [enableWebhooks, setEnableWebhooks] = useState(
    Boolean(template.webhook_service)
  );

  const { values: formikValues } = useFormikContext();
  const [jobTypeField, jobTypeMeta, jobTypeHelpers] = useField({
    name: 'job_type',
    validate: required(null, i18n),
  });
  const [, inventoryMeta, inventoryHelpers] = useField('inventory');
  const [projectField, projectMeta, projectHelpers] = useField({
    name: 'project',
    validate: () => handleProjectValidation(),
  });

  const [scmField, , scmHelpers] = useField('scm_branch');

  const [playbookField, playbookMeta, playbookHelpers] = useField({
    name: 'playbook',
    validate: required(i18n._(t`Select a value for this field`), i18n),
  });

  const [credentialField, , credentialHelpers] = useField('credentials');
  const [labelsField, , labelsHelpers] = useField('labels');
  const [limitField, limitMeta] = useField('limit');
  const [verbosityField] = useField('verbosity');
  const [diffModeField, , diffModeHelpers] = useField('diff_mode');
  const [instanceGroupsField, , instanceGroupsHelpers] = useField(
    'instanceGroups'
  );
  const [jobTagsField, , jobTagsHelpers] = useField('job_tags');
  const [skipTagsField, , skipTagsHelpers] = useField('skip_tags');

  const {
    request: fetchProject,
    error: projectContentError,
    contentLoading: hasProjectLoading,
  } = useRequest(
    useCallback(async () => {
      let projectData;
      if (template?.project) {
        projectData = await ProjectsAPI.readDetail(template?.project);
        validateField('project');
        setProject(projectData.data);
      }
    }, [template, validateField])
  );

  const {
    request: loadRelatedInstanceGroups,
    error: instanceGroupError,
    contentLoading: instanceGroupLoading,
  } = useRequest(
    useCallback(async () => {
      if (!template?.id) {
        return;
      }
      const { data } = await JobTemplatesAPI.readInstanceGroups(template.id);
      setFieldValue('initialInstanceGroups', data.results);
      setFieldValue('instanceGroups', [...data.results]);
    }, [setFieldValue, template])
  );

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    loadRelatedInstanceGroups();
  }, [loadRelatedInstanceGroups]);

  const handleProjectValidation = () => {
    if (!project && projectMeta.touched) {
      return i18n._(t`Select a value for this field`);
    }
    if (project && project.status === 'never updated') {
      return i18n._(t`This project needs to be updated`);
    }
    return undefined;
  };

  const handleProjectUpdate = useCallback(
    newProject => {
      if (project?.id !== newProject?.id) {
        // Clear the selected playbook value when a different project is selected or
        // when the project is deselected.
        playbookHelpers.setValue(0);
      }
      setProject(newProject);
      projectHelpers.setValue(newProject);
      scmHelpers.setValue('');
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const jobTypeOptions = [
    {
      value: '',
      key: '',
      label: i18n._(t`Choose a job type`),
      isDisabled: true,
    },
    { value: 'run', key: 'run', label: i18n._(t`Run`), isDisabled: false },
    {
      value: 'check',
      key: 'check',
      label: i18n._(t`Check`),
      isDisabled: false,
    },
  ];
  const verbosityOptions = [
    { value: '0', key: '0', label: i18n._(t`0 (Normal)`) },
    { value: '1', key: '1', label: i18n._(t`1 (Verbose)`) },
    { value: '2', key: '2', label: i18n._(t`2 (More Verbose)`) },
    { value: '3', key: '3', label: i18n._(t`3 (Debug)`) },
    { value: '4', key: '4', label: i18n._(t`4 (Connection Debug)`) },
  ];
  let callbackUrl;
  if (template?.related) {
    const path = template.related.callback || `${template.url}callback`;
    callbackUrl = `${origin}${path}`;
  }

  if (instanceGroupLoading || hasProjectLoading) {
    return <ContentLoading />;
  }

  if (instanceGroupError || projectContentError) {
    return <ContentError error={contentError} />;
  }

  return (
    <Form autoComplete="off" onSubmit={handleSubmit}>
      <FormColumnLayout>
        <FormField
          id="template-name"
          name="name"
          type="text"
          label={i18n._(t`Name`)}
          validate={required(null, i18n)}
          isRequired
        />
        <FormField
          id="template-description"
          name="description"
          type="text"
          label={i18n._(t`Description`)}
        />
        <FieldWithPrompt
          fieldId="template-job-type"
          isRequired
          label={i18n._(t`Job Type`)}
          promptId="template-ask-job-type-on-launch"
          promptName="ask_job_type_on_launch"
          tooltip={i18n._(t`For job templates, select run to execute
            the playbook. Select check to only check playbook syntax,
            test environment setup, and report problems without
            executing the playbook.`)}
        >
          <AnsibleSelect
            {...jobTypeField}
            isValid={!jobTypeMeta.touched || !jobTypeMeta.error}
            id="template-job-type"
            data={jobTypeOptions}
            onChange={(event, value) => {
              jobTypeHelpers.setValue(value);
            }}
          />
        </FieldWithPrompt>
        <FieldWithPrompt
          fieldId="template-inventory"
          isRequired
          label={i18n._(t`Inventory`)}
          promptId="template-ask-inventory-on-launch"
          promptName="ask_inventory_on_launch"
          tooltip={i18n._(t`Select the inventory containing the hosts
            you want this job to manage.`)}
        >
          <InventoryLookup
            value={inventory}
            onBlur={() => inventoryHelpers.setTouched()}
            onChange={value => {
              inventoryHelpers.setValue(value.id);
              setInventory(value);
            }}
            required
            touched={inventoryMeta.touched}
            error={inventoryMeta.error}
          />
          {(inventoryMeta.touched || formikValues.ask_inventory_on_launch) &&
            inventoryMeta.error && (
              <div
                className="pf-c-form__helper-text pf-m-error"
                aria-live="polite"
              >
                {inventoryMeta.error}
              </div>
            )}
        </FieldWithPrompt>

        <ProjectLookup
          value={project}
          onBlur={() => projectHelpers.setTouched()}
          tooltip={i18n._(t`Select the project containing the playbook
                  you want this job to execute.`)}
          isValid={!projectMeta.touched || !projectMeta.error}
          helperTextInvalid={projectMeta.error}
          onChange={handleProjectUpdate}
          required
        />
        {project?.allow_override && (
          <FieldWithPrompt
            fieldId="template-scm-branch"
            label={i18n._(t`Source Control Branch`)}
            promptId="template-ask-scm-branch-on-launch"
            promptName="ask_scm_branch_on_launch"
          >
            <TextInput
              id="template-scm-branch"
              {...scmField}
              onChange={(value, event) => {
                scmField.onChange(event);
              }}
            />
          </FieldWithPrompt>
        )}
        <FormGroup
          fieldId="template-playbook"
          helperTextInvalid={playbookMeta.error}
          isValid={!playbookMeta.touched || !playbookMeta.error}
          isRequired
          label={i18n._(t`Playbook`)}
        >
          <FieldTooltip
            content={i18n._(t`Select the playbook to be executed by this job.`)}
          />
          <PlaybookSelect
            projectId={project?.id || projectField.value?.id}
            isValid={!playbookMeta.touched || !playbookMeta.error}
            field={playbookField}
            onBlur={() => playbookHelpers.setTouched()}
            onError={setContentError}
          />
        </FormGroup>
        <FormFullWidthLayout>
          <FieldWithPrompt
            fieldId="template-credentials"
            label={i18n._(t`Credentials`)}
            promptId="template-ask-credential-on-launch"
            promptName="ask_credential_on_launch"
            tooltip={i18n._(t`Select credentials that allow Tower to access the nodes this job will be ran
                against. You can only select one credential of each type. For machine credentials (SSH),
                checking "Prompt on launch" without selecting credentials will require you to select a machine
                credential at run time. If you select credentials and check "Prompt on launch", the selected
                credential(s) become the defaults that can be updated at run time.`)}
          >
            <MultiCredentialsLookup
              value={credentialField.value}
              onChange={newCredentials =>
                credentialHelpers.setValue(newCredentials)
              }
              onError={setContentError}
            />
          </FieldWithPrompt>
          <FormGroup label={i18n._(t`Labels`)} fieldId="template-labels">
            <FieldTooltip
              content={i18n._(t`Optional labels that describe this job template,
                      such as 'dev' or 'test'. Labels can be used to group and filter
                      job templates and completed jobs.`)}
            />
            <LabelSelect
              value={labelsField.value}
              onChange={labels => labelsHelpers.setValue(labels)}
              onError={setContentError}
              createText={i18n._(t`Create`)}
            />
          </FormGroup>
          <VariablesField
            id="template-variables"
            name="extra_vars"
            label={i18n._(t`Variables`)}
            promptId="template-ask-variables-on-launch"
          />
          <FormColumnLayout>
            <FormField
              id="template-forks"
              name="forks"
              type="number"
              min="0"
              label={i18n._(t`Forks`)}
              tooltip={
                <span>
                  {i18n._(t`The number of parallel or simultaneous
                    processes to use while executing the playbook. An empty value,
                    or a value less than 1 will use the Ansible default which is
                    usually 5. The default number of forks can be overwritten
                    with a change to`)}{' '}
                  <code>ansible.cfg</code>.{' '}
                  {i18n._(t`Refer to the Ansible documentation for details
                        about the configuration file.`)}
                </span>
              }
            />
            <FieldWithPrompt
              fieldId="template-limit"
              label={i18n._(t`Limit`)}
              promptId="template-ask-limit-on-launch"
              promptName="ask_limit_on_launch"
              tooltip={i18n._(t`Provide a host pattern to further constrain
                  the list of hosts that will be managed or affected by the
                  playbook. Multiple patterns are allowed. Refer to Ansible
                  documentation for more information and examples on patterns.`)}
            >
              <TextInput
                id="template-limit"
                {...limitField}
                isValid={!limitMeta.touched || !limitMeta.error}
                onChange={(value, event) => {
                  limitField.onChange(event);
                }}
              />
            </FieldWithPrompt>
            <FieldWithPrompt
              fieldId="template-verbosity"
              label={i18n._(t`Verbosity`)}
              promptId="template-ask-verbosity-on-launch"
              promptName="ask_verbosity_on_launch"
              tooltip={i18n._(t`Control the level of output ansible will
                produce as the playbook executes.`)}
            >
              <AnsibleSelect
                id="template-verbosity"
                data={verbosityOptions}
                {...verbosityField}
              />
            </FieldWithPrompt>
            <FormField
              id="template-job-slicing"
              name="job_slice_count"
              type="number"
              min="1"
              label={i18n._(t`Job Slicing`)}
              tooltip={i18n._(t`Divide the work done by this job template
                  into the specified number of job slices, each running the
                  same tasks against a portion of the inventory.`)}
            />
            <FormField
              id="template-timeout"
              name="timeout"
              type="number"
              min="0"
              label={i18n._(t`Timeout`)}
              tooltip={i18n._(t`The amount of time (in seconds) to run
                  before the task is canceled. Defaults to 0 for no job
                  timeout.`)}
            />
            <FieldWithPrompt
              fieldId="template-diff-mode"
              label={i18n._(t`Show Changes`)}
              promptId="template-ask-diff-mode-on-launch"
              promptName="ask_diff_mode_on_launch"
              tooltip={i18n._(t`If enabled, show the changes made by
                Ansible tasks, where supported. This is equivalent
                to Ansible&#x2019s --diff mode.`)}
            >
              <Switch
                id="template-show-changes"
                label={diffModeField.value ? i18n._(t`On`) : i18n._(t`Off`)}
                isChecked={diffModeField.value}
                onChange={checked => diffModeHelpers.setValue(checked)}
              />
            </FieldWithPrompt>
            <FormFullWidthLayout>
              <InstanceGroupsLookup
                value={instanceGroupsField.value}
                onChange={value => instanceGroupsHelpers.setValue(value)}
                tooltip={i18n._(t`Select the Instance Groups for this Organization
                        to run on.`)}
              />
              <FieldWithPrompt
                fieldId="template-tags"
                label={i18n._(t`Job Tags`)}
                promptId="template-ask-tags-on-launch"
                promptName="ask_tags_on_launch"
                tooltip={i18n._(t`Tags are useful when you have a large
                    playbook, and you want to run a specific part of a
                    play or task. Use commas to separate multiple tags.
                    Refer to Ansible Tower documentation for details on
                    the usage of tags.`)}
              >
                <TagMultiSelect
                  value={jobTagsField.value}
                  onChange={value => jobTagsHelpers.setValue(value)}
                />
              </FieldWithPrompt>
              <FieldWithPrompt
                fieldId="template-skip-tags"
                label={i18n._(t`Skip Tags`)}
                promptId="template-ask-skip-tags-on-launch"
                promptName="ask_skip_tags_on_launch"
                tooltip={i18n._(t`Skip tags are useful when you have a
                    large playbook, and you want to skip specific parts of a
                    play or task. Use commas to separate multiple tags. Refer
                    to Ansible Tower documentation for details on the usage
                    of tags.`)}
              >
                <TagMultiSelect
                  value={skipTagsField.value}
                  onChange={value => skipTagsHelpers.setValue(value)}
                />
              </FieldWithPrompt>
              <FormGroup
                fieldId="template-option-checkboxes"
                label={i18n._(t`Options`)}
              >
                <FormCheckboxLayout>
                  <CheckboxField
                    id="option-privilege-escalation"
                    name="become_enabled"
                    label={i18n._(t`Privilege Escalation`)}
                    tooltip={i18n._(t`If enabled, run this playbook as an
                        administrator.`)}
                  />
                  <Checkbox
                    aria-label={i18n._(t`Provisioning Callbacks`)}
                    label={
                      <span>
                        {i18n._(t`Provisioning Callbacks`)}
                        &nbsp;
                        <FieldTooltip
                          content={i18n._(t`Enables creation of a provisioning
                              callback URL. Using the URL a host can contact BRAND_NAME
                              and request a configuration update using this job
                              template.`)}
                        />
                      </span>
                    }
                    id="option-callbacks"
                    isChecked={allowCallbacks}
                    onChange={checked => {
                      setAllowCallbacks(checked);
                    }}
                  />
                  <Checkbox
                    aria-label={i18n._(t`Enable Webhook`)}
                    label={
                      <span>
                        {i18n._(t`Enable Webhook`)}
                        &nbsp;
                        <FieldTooltip
                          content={i18n._(t`Enable webhook for this template.`)}
                        />
                      </span>
                    }
                    id="wfjt-enabled-webhooks"
                    isChecked={enableWebhooks}
                    onChange={checked => {
                      setEnableWebhooks(checked);
                    }}
                  />
                  <CheckboxField
                    id="option-concurrent"
                    name="allow_simultaneous"
                    label={i18n._(t`Concurrent Jobs`)}
                    tooltip={i18n._(t`If enabled, simultaneous runs of this job
                        template will be allowed.`)}
                  />
                  <CheckboxField
                    id="option-fact-cache"
                    name="use_fact_cache"
                    label={i18n._(t`Enable Fact Storage`)}
                    tooltip={i18n._(
                      t`If enabled, this will store gathered facts so they can be viewed at the host level. Facts are persisted and injected into the fact cache at runtime.`
                    )}
                  />
                </FormCheckboxLayout>
              </FormGroup>
            </FormFullWidthLayout>
            <WebhookSubForm
              enableWebhooks={enableWebhooks}
              templateType={template.type}
            />
            {allowCallbacks && (
              <>
                {callbackUrl && (
                  <FormGroup
                    label={i18n._(t`Provisioning Callback URL`)}
                    fieldId="template-callback-url"
                  >
                    <TextInput
                      id="template-callback-url"
                      isDisabled
                      value={callbackUrl}
                    />
                  </FormGroup>
                )}
                <FormField
                  id="template-host-config-key"
                  name="host_config_key"
                  label={i18n._(t`Host Config Key`)}
                  validate={allowCallbacks ? required(null, i18n) : null}
                />
              </>
            )}
          </FormColumnLayout>
        </FormFullWidthLayout>
        <FormSubmitError error={submitError} />
        <FormActionGroup onCancel={handleCancel} onSubmit={handleSubmit} />
      </FormColumnLayout>
    </Form>
  );
}
JobTemplateForm.propTypes = {
  template: JobTemplate,
  handleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  submitError: PropTypes.shape({}),
};
JobTemplateForm.defaultProps = {
  template: {
    name: '',
    description: '',
    job_type: 'run',
    inventory: undefined,
    project: undefined,
    playbook: '',
    summary_fields: {
      inventory: null,
      labels: { results: [] },
      project: null,
      credentials: [],
    },
    isNew: true,
  },
  submitError: null,
};

const FormikApp = withFormik({
  mapPropsToValues({ template = {}, i18n }) {
    const {
      summary_fields = {
        labels: { results: [] },
        inventory: { organization: null },
      },
    } = template;

    return {
      ask_credential_on_launch: template.ask_credential_on_launch || false,
      ask_diff_mode_on_launch: template.ask_diff_mode_on_launch || false,
      ask_inventory_on_launch: template.ask_inventory_on_launch || false,
      ask_job_type_on_launch: template.ask_job_type_on_launch || false,
      ask_limit_on_launch: template.ask_limit_on_launch || false,
      ask_scm_branch_on_launch: template.ask_scm_branch_on_launch || false,
      ask_skip_tags_on_launch: template.ask_skip_tags_on_launch || false,
      ask_tags_on_launch: template.ask_tags_on_launch || false,
      ask_variables_on_launch: template.ask_variables_on_launch || false,
      ask_verbosity_on_launch: template.ask_verbosity_on_launch || false,
      name: template.name || '',
      description: template.description || '',
      job_type: template.job_type || 'run',
      inventory: template.inventory || null,
      project: template.project || null,
      scm_branch: template.scm_branch || '',
      playbook: template.playbook || '',
      labels: summary_fields.labels.results || [],
      forks: template.forks || 0,
      limit: template.limit || '',
      verbosity: template.verbosity || '0',
      job_slice_count: template.job_slice_count || 1,
      timeout: template.timeout || 0,
      diff_mode: template.diff_mode || false,
      job_tags: template.job_tags || '',
      skip_tags: template.skip_tags || '',
      become_enabled: template.become_enabled || false,
      allow_callbacks: template.allow_callbacks || false,
      allow_simultaneous: template.allow_simultaneous || false,
      use_fact_cache: template.use_fact_cache || false,
      host_config_key: template.host_config_key || '',
      initialInstanceGroups: [],
      instanceGroups: [],
      credentials: summary_fields.credentials || [],
      extra_vars: template.extra_vars || '---\n',
      webhook_service: template.webhook_service || '',
      webhook_url: template?.related?.webhook_receiver
        ? `${origin}${template.related.webhook_receiver}`
        : i18n._(t`a new webhook url will be generated on save.`).toUpperCase(),
      webhook_key:
        template.webhook_key ||
        i18n._(t`a new webhook key will be generated on save.`).toUpperCase(),
      webhook_credential: template?.summary_fields?.webhook_credential || null,
    };
  },
  handleSubmit: async (values, { props, setErrors }) => {
    try {
      await props.handleSubmit(values);
    } catch (errors) {
      setErrors(errors);
    }
  },
  validate: (values, { i18n }) => {
    const errors = {};

    if (
      (!values.inventory || values.inventory === '') &&
      !values.ask_inventory_on_launch
    ) {
      errors.inventory = i18n._(
        t`Please select an Inventory or check the Prompt on Launch option.`
      );
    }

    return errors;
  },
})(JobTemplateForm);

export { JobTemplateForm as _JobTemplateForm };
export default withI18n()(FormikApp);
