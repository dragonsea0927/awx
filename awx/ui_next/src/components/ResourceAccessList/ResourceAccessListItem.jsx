import 'styled-components/macro';
import React from 'react';
import { func } from 'prop-types';

import { t } from '@lingui/macro';
import {
  Chip,
  DataListItem,
  DataListItemRow,
  DataListItemCells as PFDataListItemCells,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import DataListCell from '../DataListCell';

import ChipGroup from '../ChipGroup';
import { DetailList, Detail } from '../DetailList';
import { AccessRecord } from '../../types';

const DataListItemCells = styled(PFDataListItemCells)`
  align-items: start;
`;

function ResourceAccessListItem({ accessRecord, onRoleDelete }) {
  ResourceAccessListItem.propTypes = {
    accessRecord: AccessRecord.isRequired,
    onRoleDelete: func.isRequired,
  };

  const getRoleLists = () => {
    const teamRoles = [];
    const userRoles = [];

    function sort(item) {
      const { role } = item;
      if (role.team_id) {
        teamRoles.push(role);
      } else {
        userRoles.push(role);
      }
    }

    accessRecord.summary_fields.direct_access.map(sort);
    accessRecord.summary_fields.indirect_access.map(sort);
    return [teamRoles, userRoles];
  };

  const renderChip = role => {
    return (
      <Chip
        key={role.id}
        onClick={() => {
          onRoleDelete(role, accessRecord);
        }}
        isReadOnly={!role.user_capabilities.unattach}
        ouiaId={`${role.name}-${role.id}`}
        closeBtnAriaLabel={t`Remove ${role.name} chip`}
      >
        {role.name}
      </Chip>
    );
  };

  const [teamRoles, userRoles] = getRoleLists();

  return (
    <DataListItem
      aria-labelledby="access-list-item"
      key={accessRecord.id}
      id={`${accessRecord.id}`}
    >
      <DataListItemRow>
        <DataListItemCells
          dataListCells={[
            <DataListCell key="name">
              {accessRecord.username && (
                <TextContent>
                  {accessRecord.id ? (
                    <Text component={TextVariants.h6}>
                      <Link
                        to={{ pathname: `/users/${accessRecord.id}/details` }}
                        css="font-weight: bold"
                      >
                        {accessRecord.username}
                      </Link>
                    </Text>
                  ) : (
                    <Text component={TextVariants.h6} css="font-weight: bold">
                      {accessRecord.username}
                    </Text>
                  )}
                </TextContent>
              )}
              {accessRecord.first_name || accessRecord.last_name ? (
                <DetailList stacked>
                  <Detail
                    label={t`Name`}
                    value={`${accessRecord.first_name} ${accessRecord.last_name}`}
                  />
                </DetailList>
              ) : null}
            </DataListCell>,
            <DataListCell key="roles">
              <DetailList stacked>
                {userRoles.length > 0 && (
                  <Detail
                    label={t`User Roles`}
                    value={
                      <ChipGroup numChips={5} totalChips={userRoles.length}>
                        {userRoles.map(renderChip)}
                      </ChipGroup>
                    }
                  />
                )}
                {teamRoles.length > 0 && (
                  <Detail
                    label={t`Team Roles`}
                    value={
                      <ChipGroup numChips={5} totalChips={teamRoles.length}>
                        {teamRoles.map(renderChip)}
                      </ChipGroup>
                    }
                  />
                )}
              </DetailList>
            </DataListCell>,
          ]}
        />
      </DataListItemRow>
    </DataListItem>
  );
}

export default ResourceAccessListItem;
