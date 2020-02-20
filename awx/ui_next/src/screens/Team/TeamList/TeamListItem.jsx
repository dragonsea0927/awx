import React, { Fragment } from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Button,
  DataListCheck,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PencilAltIcon } from '@patternfly/react-icons';

import DataListCell from '@components/DataListCell';
import { Team } from '@types';

class TeamListItem extends React.Component {
  static propTypes = {
    team: Team.isRequired,
    detailUrl: string.isRequired,
    isSelected: bool.isRequired,
    onSelect: func.isRequired,
  };

  render() {
    const { team, isSelected, onSelect, detailUrl, i18n } = this.props;
    const labelId = `check-action-${team.id}`;
    return (
      <DataListItem key={team.id} aria-labelledby={labelId} id={`${team.id}`}>
        <DataListItemRow>
          <DataListCheck
            id={`select-team-${team.id}`}
            checked={isSelected}
            onChange={onSelect}
            aria-labelledby={labelId}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key="divider">
                <Link id={labelId} to={`${detailUrl}`}>
                  <b>{team.name}</b>
                </Link>
              </DataListCell>,
              <DataListCell key="organization">
                {team.summary_fields.organization && (
                  <Fragment>
                    <b css={{ marginRight: '20px' }}>
                      {i18n._(t`Organization`)}
                    </b>
                    <Link
                      to={`/organizations/${team.summary_fields.organization.id}/details`}
                    >
                      <b>{team.summary_fields.organization.name}</b>
                    </Link>
                  </Fragment>
                )}
              </DataListCell>,
              <DataListCell key="edit" alignRight isFilled={false}>
                {team.summary_fields.user_capabilities.edit && (
                  <Tooltip content={i18n._(t`Edit Team`)} position="top">
                    <Button
                      variant="plain"
                      component={Link}
                      to={`/teams/${team.id}/edit`}
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
}
export default withI18n()(TeamListItem);
