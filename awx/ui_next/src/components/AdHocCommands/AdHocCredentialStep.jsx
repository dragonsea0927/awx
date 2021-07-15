import React, { useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { t } from '@lingui/macro';
import PropTypes from 'prop-types';
import { useField } from 'formik';
import { Form, FormGroup } from '@patternfly/react-core';
import { CredentialsAPI } from '../../api';
import Popover from '../Popover';

import { getQSConfig, parseQueryString, mergeParams } from '../../util/qs';
import useRequest from '../../util/useRequest';
import ContentError from '../ContentError';
import ContentLoading from '../ContentLoading';
import { required } from '../../util/validators';
import OptionsList from '../OptionsList';

const QS_CONFIG = getQSConfig('credentials', {
  page: 1,
  page_size: 5,
  order_by: 'name',
});

function AdHocCredentialStep({ credentialTypeId, onEnableLaunch }) {
  const history = useHistory();
  const {
    error,
    isLoading,
    request: fetchCredentials,
    result: {
      credentials,
      credentialCount,
      relatedSearchableKeys,
      searchableKeys,
    },
  } = useRequest(
    useCallback(async () => {
      const params = parseQueryString(QS_CONFIG, history.location.search);

      const [
        {
          data: { results, count },
        },
        actionsResponse,
      ] = await Promise.all([
        CredentialsAPI.read(
          mergeParams(params, { credential_type: credentialTypeId })
        ),
        CredentialsAPI.readOptions(),
      ]);

      return {
        credentials: results,
        credentialCount: count,
        relatedSearchableKeys: (
          actionsResponse?.data?.related_search_fields || []
        ).map(val => val.slice(0, -8)),
        searchableKeys: Object.keys(
          actionsResponse.data.actions?.GET || {}
        ).filter(key => actionsResponse.data.actions?.GET[key].filterable),
      };
    }, [credentialTypeId, history.location.search]),
    {
      credentials: [],
      credentialCount: 0,
      relatedSearchableKeys: [],
      searchableKeys: [],
    }
  );

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const [credentialField, credentialMeta, credentialHelpers] = useField({
    name: 'credential',
    validate: required(null),
  });
  if (error) {
    return <ContentError error={error} />;
  }
  if (isLoading) {
    return <ContentLoading />;
  }
  return (
    <Form>
      <FormGroup
        fieldId="credential"
        label={t`Machine Credential`}
        aria-label={t`Machine Credential`}
        isRequired
        validated={
          !credentialMeta.touched || !credentialMeta.error ? 'default' : 'error'
        }
        helperTextInvalid={credentialMeta.error}
        labelIcon={
          <Popover
            content={t`Select the credential you want to use when accessing the remote hosts to run the command. Choose the credential containing the username and SSH key or password that Ansible will need to log into the remote hosts.`}
          />
        }
      >
        <OptionsList
          value={credentialField.value || []}
          options={credentials}
          optionCount={credentialCount}
          header={t`Machine Credential`}
          readOnly
          qsConfig={QS_CONFIG}
          relatedSearchableKeys={relatedSearchableKeys}
          searchableKeys={searchableKeys}
          searchColumns={[
            {
              name: t`Name`,
              key: 'name',
              isDefault: true,
            },
            {
              name: t`Created By (Username)`,
              key: 'created_by__username',
            },
            {
              name: t`Modified By (Username)`,
              key: 'modified_by__username',
            },
          ]}
          sortColumns={[
            {
              name: t`Name`,
              key: 'name',
            },
          ]}
          name="credential"
          selectItem={value => {
            credentialHelpers.setValue([value]);
            onEnableLaunch();
          }}
          deselectItem={() => {
            credentialHelpers.setValue([]);
          }}
        />
      </FormGroup>
    </Form>
  );
}

AdHocCredentialStep.propTypes = {
  credentialTypeId: PropTypes.number.isRequired,
  onEnableLaunch: PropTypes.func.isRequired,
};
export default AdHocCredentialStep;
