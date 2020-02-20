import React from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Badge as PFBadge,
  Button,
  DataListCheck,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { PencilAltIcon } from '@patternfly/react-icons';

import DataListCell from '@components/DataListCell';
import { Organization } from '@types';

const Badge = styled(PFBadge)`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-left: 10px;
`;

const ListGroup = styled.span`
  display: flex;
  margin-left: 40px;

  @media screen and (min-width: 768px) {
    margin-left: 20px;

    &:first-of-type {
      margin-left: 0;
    }
  }
`;

function OrganizationListItem({
  organization,
  isSelected,
  onSelect,
  detailUrl,
  i18n,
}) {
  const labelId = `check-action-${organization.id}`;
  return (
    <DataListItem
      key={organization.id}
      aria-labelledby={labelId}
      id={`${organization.id}`}
    >
      <DataListItemRow>
        <DataListCheck
          id={`select-organization-${organization.id}`}
          checked={isSelected}
          onChange={onSelect}
          aria-labelledby={labelId}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell key="divider">
              <span id={labelId}>
                <Link to={`${detailUrl}`}>
                  <b>{organization.name}</b>
                </Link>
              </span>
            </DataListCell>,
            <DataListCell key="related-field-counts">
              <ListGroup>
                {i18n._(t`Members`)}
                <Badge isRead>
                  {organization.summary_fields.related_field_counts.users}
                </Badge>
              </ListGroup>
              <ListGroup>
                {i18n._(t`Teams`)}
                <Badge isRead>
                  {organization.summary_fields.related_field_counts.teams}
                </Badge>
              </ListGroup>
            </DataListCell>,
            <DataListCell key="edit" alignRight isFilled={false}>
              {organization.summary_fields.user_capabilities.edit && (
                <Tooltip content={i18n._(t`Edit Organization`)} position="top">
                  <Button
                    variant="plain"
                    component={Link}
                    to={`/organizations/${organization.id}/edit`}
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

OrganizationListItem.propTypes = {
  organization: Organization.isRequired,
  detailUrl: string.isRequired,
  isSelected: bool.isRequired,
  onSelect: func.isRequired,
};

export default withI18n()(OrganizationListItem);
