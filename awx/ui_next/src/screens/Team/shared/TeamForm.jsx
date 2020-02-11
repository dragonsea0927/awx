import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik, Field } from 'formik';
import { Form } from '@patternfly/react-core';
import FormActionGroup from '@components/FormActionGroup/FormActionGroup';
import FormField, { FormSubmitError } from '@components/FormField';
import FormRow from '@components/FormRow';
import OrganizationLookup from '@components/Lookup/OrganizationLookup';
import { required } from '@util/validators';

function TeamForm(props) {
  const { team, handleCancel, handleSubmit, submitError, i18n } = props;
  const [organization, setOrganization] = useState(
    team.summary_fields ? team.summary_fields.organization : null
  );

  return (
    <Formik
      initialValues={{
        description: team.description || '',
        name: team.name || '',
        organization: team.organization || '',
      }}
      onSubmit={handleSubmit}
    >
      {formik => (
        <Form
          autoComplete="off"
          onSubmit={formik.handleSubmit}
          css="padding: 0 24px"
        >
          <FormRow>
            <FormField
              id="team-name"
              label={i18n._(t`Name`)}
              name="name"
              type="text"
              validate={required(null, i18n)}
              isRequired
            />
            <FormField
              id="team-description"
              label={i18n._(t`Description`)}
              name="description"
              type="text"
            />
            <Field
              name="organization"
              validate={required(
                i18n._(t`Select a value for this field`),
                i18n
              )}
            >
              {({ form }) => (
                <OrganizationLookup
                  helperTextInvalid={form.errors.organization}
                  isValid={
                    !form.touched.organization || !form.errors.organization
                  }
                  onBlur={() => form.setFieldTouched('organization')}
                  onChange={value => {
                    form.setFieldValue('organization', value.id);
                    setOrganization(value);
                  }}
                  value={organization}
                  required
                />
              )}
            </Field>
          </FormRow>
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

TeamForm.propTypes = {
  handleCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  team: PropTypes.shape({}),
  submitError: PropTypes.shape(),
};

TeamForm.defaultProps = {
  team: {},
  submitError: null,
};

export default withI18n()(TeamForm);
