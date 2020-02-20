import React from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Button,
  DataListAction as _DataListAction,
  DataListCell,
  DataListCheck,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Switch,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PencilAltIcon } from '@patternfly/react-icons';
import Sparkline from '@components/Sparkline';
import { Host } from '@types';
import styled from 'styled-components';

const DataListAction = styled(_DataListAction)`
  align-items: center;
  display: grid;
  grid-gap: 24px;
  grid-template-columns: min-content 40px;
`;

function InventoryHostItem(props) {
  const {
    detailUrl,
    editUrl,
    host,
    i18n,
    isSelected,
    onSelect,
    toggleHost,
    toggleLoading,
  } = props;

  const recentPlaybookJobs = host.summary_fields.recent_jobs.map(job => ({
    ...job,
    type: 'job',
  }));

  const labelId = `check-action-${host.id}`;

  return (
    <DataListItem key={host.id} aria-labelledby={labelId} id={`${host.id}`}>
      <DataListItemRow>
        <DataListCheck
          id={`select-host-${host.id}`}
          checked={isSelected}
          onChange={onSelect}
          aria-labelledby={labelId}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell key="divider">
              <Link to={`${detailUrl}`}>
                <b>{host.name}</b>
              </Link>
            </DataListCell>,
            <DataListCell key="recentJobs">
              <Sparkline jobs={recentPlaybookJobs} />
            </DataListCell>,
          ]}
        />
        <DataListAction
          aria-label="actions"
          aria-labelledby={labelId}
          id={labelId}
        >
          <Tooltip
            content={i18n._(
              t`Indicates if a host is available and should be included
              in running jobs.  For hosts that are part of an external
              inventory, this may be reset by the inventory sync process.`
            )}
            position="top"
          >
            <Switch
              css="display: inline-flex;"
              id={`host-${host.id}-toggle`}
              label={i18n._(t`On`)}
              labelOff={i18n._(t`Off`)}
              isChecked={host.enabled}
              isDisabled={
                toggleLoading || !host.summary_fields.user_capabilities?.edit
              }
              onChange={() => toggleHost(host)}
              aria-label={i18n._(t`Toggle host`)}
            />
          </Tooltip>
          {host.summary_fields.user_capabilities?.edit && (
            <Tooltip content={i18n._(t`Edit Host`)} position="top">
              <Button variant="plain" component={Link} to={`${editUrl}`}>
                <PencilAltIcon />
              </Button>
            </Tooltip>
          )}
        </DataListAction>
      </DataListItemRow>
    </DataListItem>
  );
}

InventoryHostItem.propTypes = {
  detailUrl: string.isRequired,
  host: Host.isRequired,
  isSelected: bool.isRequired,
  onSelect: func.isRequired,
  toggleHost: func.isRequired,
  toggleLoading: bool.isRequired,
};

export default withI18n()(InventoryHostItem);
