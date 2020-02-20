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
import { User } from '@types';

class UserListItem extends React.Component {
  static propTypes = {
    user: User.isRequired,
    detailUrl: string.isRequired,
    isSelected: bool.isRequired,
    onSelect: func.isRequired,
  };

  render() {
    const { user, isSelected, onSelect, detailUrl, i18n } = this.props;
    const labelId = `check-action-${user.id}`;
    return (
      <DataListItem key={user.id} aria-labelledby={labelId} id={`${user.id}`}>
        <DataListItemRow>
          <DataListCheck
            id={`select-user-${user.id}`}
            checked={isSelected}
            onChange={onSelect}
            aria-labelledby={labelId}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key="divider">
                <Link to={`${detailUrl}`} id={labelId}>
                  <b>{user.username}</b>
                </Link>
              </DataListCell>,
              <DataListCell key="first-name">
                {user.first_name && (
                  <Fragment>
                    <b css={{ marginRight: '20px' }}>{i18n._(t`First Name`)}</b>
                    {user.first_name}
                  </Fragment>
                )}
              </DataListCell>,
              <DataListCell key="last-name">
                {user.last_name && (
                  <Fragment>
                    <b css={{ marginRight: '20px' }}>{i18n._(t`Last Name`)}</b>
                    {user.last_name}
                  </Fragment>
                )}
              </DataListCell>,
              <DataListCell key="edit" alignRight isFilled={false}>
                {user.summary_fields.user_capabilities.edit && (
                  <Tooltip content={i18n._(t`Edit User`)} position="top">
                    <Button
                      variant="plain"
                      component={Link}
                      to={`/users/${user.id}/edit`}
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
export default withI18n()(UserListItem);
