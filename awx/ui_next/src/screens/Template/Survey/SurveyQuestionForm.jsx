import React from 'react';
import { func, string, bool, number, shape } from 'prop-types';
import { Formik, useField } from 'formik';

import { t } from '@lingui/macro';
import { Form, FormGroup } from '@patternfly/react-core';
import { FormColumnLayout } from '../../../components/FormLayout';
import FormActionGroup from '../../../components/FormActionGroup/FormActionGroup';
import FormField, {
  CheckboxField,
  PasswordField,
  FormSubmitError,
  TextAndCheckboxField,
} from '../../../components/FormField';

import AnsibleSelect from '../../../components/AnsibleSelect';
import Popover from '../../../components/Popover';
import {
  required,
  noWhiteSpace,
  combine,
  maxLength,
  integer,
  number as numberValidator,
} from '../../../util/validators';

function AnswerTypeField() {
  const [field] = useField({
    name: 'type',
    validate: required(t`Select a value for this field`),
  });

  return (
    <FormGroup
      label={t`Answer type`}
      labelIcon={
        <Popover
          content={t`Choose an answer type or format you want as the prompt for the user.
          Refer to the Ansible Tower Documentation for more additional
          information about each option.`}
        />
      }
      isRequired
      fieldId="question-answer-type"
    >
      <AnsibleSelect
        id="question-type"
        {...field}
        data={[
          { key: 'text', value: 'text', label: t`Text` },
          { key: 'textarea', value: 'textarea', label: t`Textarea` },
          { key: 'password', value: 'password', label: t`Password` },
          {
            key: 'multiplechoice',
            value: 'multiplechoice',
            label: t`Multiple Choice (single select)`,
          },
          {
            key: 'multiselect',
            value: 'multiselect',
            label: t`Multiple Choice (multiple select)`,
          },
          { key: 'integer', value: 'integer', label: t`Integer` },
          { key: 'float', value: 'float', label: t`Float` },
        ]}
      />
    </FormGroup>
  );
}

function SurveyQuestionForm({
  question,
  handleSubmit,
  handleCancel,
  submitError,
}) {
  const defaultIsNotAvailable = choices => {
    return defaultValue => {
      let errorMessage;
      const found = [...defaultValue].every(dA => {
        return choices.indexOf(dA) > -1;
      });

      if (!found) {
        errorMessage = t`Default choice must be answered from the choices listed.`;
      }
      return errorMessage;
    };
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{
        question_name: question?.question_name || '',
        question_description: question?.question_description || '',
        required: question ? question?.required : true,
        type: question?.type || 'text',
        variable: question?.variable || '',
        min: question?.min || 0,
        max: question?.max || 1024,
        default: question?.default || '',
        choices: question?.choices || '',
        new_question: !question,
      }}
      onSubmit={handleSubmit}
    >
      {formik => (
        <Form autoComplete="off" onSubmit={formik.handleSubmit}>
          <FormColumnLayout>
            <FormField
              id="question-name"
              name="question_name"
              type="text"
              label={t`Question`}
              validate={required(null)}
              isRequired
            />
            <FormField
              id="question-description"
              name="question_description"
              type="text"
              label={t`Description`}
            />
            <FormField
              id="question-variable"
              name="variable"
              type="text"
              label={t`Answer variable name`}
              validate={combine([noWhiteSpace(), required(null)])}
              isRequired
              tooltip={t`The suggested format for variable names is lowercase and
                underscore-separated (for example, foo_bar, user_id, host_name,
                etc.). Variable names with spaces are not allowed.`}
            />
            <AnswerTypeField />
            <CheckboxField
              id="question-required"
              name="required"
              label={t`Required`}
            />
          </FormColumnLayout>
          <FormColumnLayout>
            {['text', 'textarea', 'password'].includes(formik.values.type) && (
              <>
                <FormField
                  id="question-min"
                  name="min"
                  type="number"
                  label={t`Minimum length`}
                />
                <FormField
                  id="question-max"
                  name="max"
                  type="number"
                  label={t`Maximum length`}
                />
              </>
            )}
            {['integer', 'float'].includes(formik.values.type) && (
              <>
                <FormField
                  id="question-min"
                  name="min"
                  type="number"
                  label={t`Minimum`}
                />
                <FormField
                  id="question-max"
                  name="max"
                  type="number"
                  label={t`Maximum`}
                />
              </>
            )}
            {['text', 'integer', 'float'].includes(formik.values.type) && (
              <FormField
                id="question-default"
                name="default"
                validate={
                  {
                    text: maxLength(formik.values.max),
                    integer: integer(),
                    float: numberValidator(),
                  }[formik.values.type]
                }
                min={formik.values.min}
                max={formik.values.max}
                type={formik.values.type === 'text' ? 'text' : 'number'}
                label={t`Default answer`}
              />
            )}
            {formik.values.type === 'textarea' && (
              <FormField
                id="question-default"
                name="default"
                type="textarea"
                label={t`Default answer`}
              />
            )}
            {formik.values.type === 'password' && (
              <PasswordField
                id="question-default"
                name="default"
                label={t`Default answer`}
              />
            )}
            {['multiplechoice', 'multiselect'].includes(formik.values.type) && (
              <>
                <TextAndCheckboxField
                  id="question-options"
                  name="choices"
                  type={formik.values.type}
                  label={t`Multiple Choice Options`}
                  validate={required()}
                  tooltip={t`Each answer choice must be on a separate line.`}
                  isRequired
                  rows="10"
                />
                <FormField
                  id="question-default"
                  name="default"
                  validate={defaultIsNotAvailable(formik.values.choices)}
                  type={
                    formik.values.type === 'multiplechoice'
                      ? 'text'
                      : 'textarea'
                  }
                  label={t`Default answer`}
                />
              </>
            )}
          </FormColumnLayout>
          <FormSubmitError error={submitError} />
          <FormActionGroup
            onCancel={handleCancel}
            onSubmit={formik.handleSubmit}
          />
        </Form>
      )}
    </Formik>
  );
}

SurveyQuestionForm.propTypes = {
  question: shape({
    question_name: string.isRequired,
    question_description: string.isRequired,
    required: bool,
    type: string.isRequired,
    min: number,
    max: number,
  }),
  handleSubmit: func.isRequired,
  handleCancel: func.isRequired,
  submitError: shape({}),
};

SurveyQuestionForm.defaultProps = {
  question: null,
  submitError: null,
};

export default SurveyQuestionForm;
