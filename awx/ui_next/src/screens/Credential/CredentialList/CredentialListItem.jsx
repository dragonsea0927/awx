import React from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Link } from 'react-router-dom';
import {
  Button,
  DataListCheck,
  DataListItem,
  DataListItemRow,
  DataListItemCells as _DataListItemCells,
  Tooltip,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';

import DataListCell from '@components/DataListCell';
import styled from 'styled-components';
import { Credential } from '@types';

const DataListItemCells = styled(_DataListItemCells)`
  ${DataListCell}:first-child {
    flex-grow: 2;
  }
`;

function CredentialListItem({
  credential,
  detailUrl,
  isSelected,
  onSelect,
  i18n,
}) {
  const labelId = `check-action-${credential.id}`;
  const canEdit = credential.summary_fields.user_capabilities.edit;

  return (
    <DataListItem
      key={credential.id}
      aria-labelledby={labelId}
      id={`${credential.id}`}
    >
      <DataListItemRow>
        <DataListCheck
          id={`select-credential-${credential.id}`}
          checked={isSelected}
          onChange={onSelect}
          aria-labelledby={labelId}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell key="name">
              <Link to={`${detailUrl}`}>
                <b>{credential.name}</b>
              </Link>
            </DataListCell>,
            <DataListCell key="type">
              {credential.summary_fields.credential_type.name}
            </DataListCell>,
            <DataListCell key="edit" alignRight isFilled={false}>
              {canEdit && (
                <Tooltip content={i18n._(t`Edit Credential`)} position="top">
                  <Button
                    variant="plain"
                    component={Link}
                    to={`/credentials/${credential.id}/edit`}
                  >
                    <PencilAltIcon />
                  </Button>
                </Tooltip>
              )}
            </DataListCell>,
          ]}
        />
      </DataListItemRow>
    </DataListItem>
  );
}

CredentialListItem.propTypes = {
  detailUrl: string.isRequired,
  credential: Credential.isRequired,
  isSelected: bool.isRequired,
  onSelect: func.isRequired,
};

export default withI18n()(CredentialListItem);
