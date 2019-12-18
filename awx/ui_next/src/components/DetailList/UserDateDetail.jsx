import React from 'react';
import { node, string } from 'prop-types';
import { Trans } from '@lingui/macro';
import { Link } from 'react-router-dom';
import { formatDateString } from '@util/dates';
import Detail from './Detail';
import { SummaryFieldUser } from '../../types';

function UserDateDetail({ label, date, user }) {
  const dateStr = formatDateString(date);
  const username = user ? user.username : '';
  return (
    <Detail
      label={label}
      value={
        user ? (
          <Trans>
            {dateStr} by <Link to={`/users/${user.id}`}>{username}</Link>
          </Trans>
        ) : (
          dateStr
        )
      }
    />
  );
}
UserDateDetail.propTypes = {
  label: node.isRequired,
  date: string.isRequired,
  user: SummaryFieldUser,
};
UserDateDetail.defaultProps = {
  user: null,
};

export default UserDateDetail;
