import React from 'react';
import { Wizard } from '@patternfly/react-core';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik, useFormikContext } from 'formik';
import ContentError from '../ContentError';
import ContentLoading from '../ContentLoading';
import { useDismissableError } from '../../util/useRequest';
import mergeExtraVars from './mergeExtraVars';
import useLaunchSteps from './useLaunchSteps';
import AlertModal from '../AlertModal';
import getSurveyValues from './getSurveyValues';

function PromptModalForm({ onSubmit, onCancel, i18n, config, resource }) {
  const { values, setTouched, validateForm } = useFormikContext();

  const {
    steps,
    isReady,
    visitStep,
    visitAllSteps,
    contentError,
  } = useLaunchSteps(config, resource, i18n);

  const handleSave = () => {
    const postValues = {};
    const setValue = (key, value) => {
      if (typeof value !== 'undefined' && value !== null) {
        postValues[key] = value;
      }
    };
    const surveyValues = getSurveyValues(values);
    setValue('inventory_id', values.inventory?.id);
    setValue(
      'credentials',
      values.credentials?.map(c => c.id)
    );
    setValue('job_type', values.job_type);
    setValue('limit', values.limit);
    setValue('job_tags', values.job_tags);
    setValue('skip_tags', values.skip_tags);
    const extraVars = config.ask_variables_on_launch
      ? values.extra_vars || '---'
      : resource.extra_vars;
    setValue('extra_vars', mergeExtraVars(extraVars, surveyValues));
    setValue('scm_branch', values.scm_branch);

    onSubmit(postValues);
  };
  const { error, dismissError } = useDismissableError(contentError);

  if (error) {
    return (
      <AlertModal
        isOpen={error}
        variant="error"
        title={i18n._(t`Error!`)}
        onClose={() => {
          dismissError();
        }}
      >
        <ContentError error={error} />
      </AlertModal>
    );
  }

  return (
    <Wizard
      isOpen
      onClose={onCancel}
      onSave={handleSave}
      onNext={async (nextStep, prevStep) => {
        if (nextStep.id === 'preview') {
          visitAllSteps(setTouched);
        } else {
          visitStep(prevStep.prevId);
        }
        await validateForm();
      }}
      onGoToStep={async (nextStep, prevStep) => {
        if (nextStep.id === 'preview') {
          visitAllSteps(setTouched);
        } else {
          visitStep(prevStep.prevId);
        }
        await validateForm();
      }}
      title={i18n._(t`Prompts`)}
      steps={
        isReady
          ? steps
          : [
              {
                name: i18n._(t`Content Loading`),
                component: <ContentLoading />,
              },
            ]
      }
      backButtonText={i18n._(t`Back`)}
      cancelButtonText={i18n._(t`Cancel`)}
      nextButtonText={i18n._(t`Next`)}
    />
  );
}

function LaunchPrompt({ config, resource = {}, onLaunch, onCancel, i18n }) {
  return (
    <Formik
      initialValues={{
        verbosity: config.ask_verbosity_on_launch && (resource.verbosity || 0),
        inventory:
          config.ask_inventoryon_launch && resource.summary_fields?.inventory,
        credentials:
          config.ask_credential_on_launch &&
          resource.summary_fields?.credentials,
        diff_mode:
          config.ask_diff_mode_on_launch && (resource.diff_mode || false),
        extra_vars:
          config.ask_variables_on_launch && (resource.extra_vars || '---'),
        job_type: config.ask_job_type_on_launch && (resource.job_type || ''),
        job_tags: config.ask_job_tags_on_launch && (resource.job_tags || ''),
        skip_tags: config.ask_skip_tags_on_launch && (resource.skip_tags || ''),
        scm_branch:
          config.ask_scm_branch_on_launch && (resource.scm_branch || ''),
        limit: config.ask_limit_on_launch && (resource.limit || ''),
      }}
      onSubmit={values => onLaunch(values)}
    >
      <PromptModalForm
        onSubmit={values => onLaunch(values)}
        onCancel={onCancel}
        i18n={i18n}
        config={config}
        resource={resource}
      />
    </Formik>
  );
}

export { LaunchPrompt as _LaunchPrompt };
export default withI18n()(LaunchPrompt);
