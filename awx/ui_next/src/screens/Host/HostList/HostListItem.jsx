import React, { Fragment } from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Button,
  DataListAction as _DataListAction,
  DataListCell,
  DataListCheck,
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  Tooltip,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { PencilAltIcon } from '@patternfly/react-icons';

import Sparkline from '@components/Sparkline';
import { Host } from '@types';
import styled from 'styled-components';
import HostToggle from '../shared/HostToggle';

const DataListAction = styled(_DataListAction)`
  align-items: center;
  display: grid;
  grid-gap: 24px;
  grid-template-columns: min-content 40px;
`;

class HostListItem extends React.Component {
  static propTypes = {
    host: Host.isRequired,
    detailUrl: string.isRequired,
    isSelected: bool.isRequired,
    onSelect: func.isRequired,
  };

  render() {
    const { host, isSelected, onSelect, detailUrl, i18n } = this.props;

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
              <DataListCell key="name">
                <Link to={`${detailUrl}`}>
                  <b>{host.name}</b>
                </Link>
              </DataListCell>,
              <DataListCell key="recentJobs">
                <Sparkline jobs={recentPlaybookJobs} />
              </DataListCell>,
              <DataListCell key="inventory">
                {host.summary_fields.inventory && (
                  <Fragment>
                    <b css="margin-right: 24px">{i18n._(t`Inventory`)}</b>
                    <Link
                      to={`/inventories/${
                        host.summary_fields.inventory.kind === 'smart'
                          ? 'smart_inventory'
                          : 'inventory'
                      }/${host.summary_fields.inventory.id}/details`}
                    >
                      {host.summary_fields.inventory.name}
                    </Link>
                  </Fragment>
                )}
              </DataListCell>,
              <DataListCell key="enable" alignRight isFilled={false}>
                <HostToggle host={host} />
              </DataListCell>,
              <DataListCell key="edit" alignRight isFilled={false}>
                {host.summary_fields.user_capabilities.edit && (
                  <Tooltip content={i18n._(t`Edit Host`)} position="top">
                    <Button
                      variant="plain"
                      component={Link}
                      to={`/hosts/${host.id}/edit`}
                    >
                      <PencilAltIcon />
                    </Button>
                  </Tooltip>
                )}
              </DataListCell>,
            ]}
          />
          <DataListAction
            aria-label="actions"
            aria-labelledby={labelId}
            id={labelId}
          >
            <HostToggle host={host} />
            {host.summary_fields.user_capabilities.edit && (
              <Tooltip content={i18n._(t`Edit Host`)} position="top">
                <Button
                  variant="plain"
                  component={Link}
                  to={`/hosts/${host.id}/edit`}
                >
                  <PencilAltIcon />
                </Button>
              </Tooltip>
            )}
          </DataListAction>
        </DataListItemRow>
      </DataListItem>
    );
  }
}
export default withI18n()(HostListItem);
