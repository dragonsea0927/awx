import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { I18n, i18nMark } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Button,
  Checkbox,
  Level,
  LevelItem,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  TrashAltIcon,
  PlusIcon,
} from '@patternfly/react-icons';
import {
  Link
} from 'react-router-dom';

import ExpandCollapse from '../ExpandCollapse';
import Search from '../Search';
import Sort from '../Sort';
import VerticalSeparator from '../VerticalSeparator';

class DataListToolbar extends React.Component {
  render () {
    const {
      add,
      addUrl,
      columns,
      deleteTooltip,
      disableTrashCanIcon,
      isAllSelected,
      isCompact,
      noLeftMargin,
      onSort,
      onSearch
      onCompact,
      onExpand,
      onOpenDeleteModal,
      onSearch,
      onSelectAll,
      onSort,
      showAdd,
      showDelete,
      showSelectAll,
      sortOrder,
      sortedColumnKey
    } = this.props;

    const showExpandCollapse = (onCompact && onExpand);
    return (
      <I18n>
        {({ i18n }) => (
          <div className="awx-toolbar">
            <Level>
              <LevelItem style={{ display: 'flex', flexBasis: '700px' }}>
                <Toolbar style={{ marginLeft: noLeftMargin ? '0px' : '20px', flexGrow: '1' }}>
                  { showSelectAll && (
                    <ToolbarGroup>
                      <ToolbarItem>
                        <Checkbox
                          checked={isAllSelected}
                          onChange={onSelectAll}
                          aria-label={i18n._(t`Select all`)}
                          id="select-all"
                        />
                      </ToolbarItem>
                      <VerticalSeparator />
                    </ToolbarGroup>
                  )}
                  <ToolbarGroup style={{ flexGrow: '1' }}>
                    <ToolbarItem style={{ flexGrow: '1' }}>
                      <Search
                        columns={columns}
                        onSearch={onSearch}
                        sortedColumnKey={sortedColumnKey}
                      />
                    </ToolbarItem>
                    <VerticalSeparator />
                  </ToolbarGroup>
                  <ToolbarGroup
                    className="sortDropdownGroup"
                  >
                    <ToolbarItem>
                      <Sort
                        columns={columns}
                        onSort={onSort}
                        sortOrder={sortOrder}
                        sortedColumnKey={sortedColumnKey}
                      />
                    </ToolbarItem>
                  </ToolbarGroup>
                  { (showExpandCollapse || showDelete || addUrl || add) && (
                    <VerticalSeparator />
                  )}
                  {showExpandCollapse && (
                    <Fragment>
                      <ToolbarGroup>
                        <ExpandCollapse
                          isCompact={isCompact}
                          onCompact={onCompact}
                          onExpand={onExpand}
                        />
                      </ToolbarGroup>
                      { (showDelete || addUrl || add) && (
                        <VerticalSeparator />
                      )}
                    </Fragment>
                  )}
                </Toolbar>
              </LevelItem>
              <LevelItem>
                { showDelete && (
                  <Tooltip
                    content={deleteTooltip}
                    position="left"
                  >
                    <span>
                      <Button
                        className="awx-ToolBarBtn"
                        variant="plain"
                        aria-label={i18n._(t`Delete`)}
                        onClick={onOpenDeleteModal}
                        isDisabled={disableTrashCanIcon}
                      >
                        <TrashAltIcon className="awx-ToolBarTrashCanIcon" />
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {showAdd && addUrl && (
                  <Link to={addUrl}>
                    <Button
                      variant="primary"
                      aria-label={i18n._(t`Add`)}
                    >
                      <PlusIcon />
                    </Button>
                  </Link>
                )}
                {showAdd && add && (
                  <Fragment>{add}</Fragment>
                )}
              </LevelItem>
            </Level>
          </div>
        )}
      </I18n>
    );
  }
}

DataListToolbar.propTypes = {
  add: PropTypes.node,
  addUrl: PropTypes.string,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteTooltip: PropTypes.node,
  isAllSelected: PropTypes.bool,
  noLeftMargin: PropTypes.bool,
  onSearch: PropTypes.func,
  onSelectAll: PropTypes.func,
  onSort: PropTypes.func,
  showAdd: PropTypes.bool,
  showDelete: PropTypes.bool,
  showSelectAll: PropTypes.bool,
  sortOrder: PropTypes.string,
  sortedColumnKey: PropTypes.string,
  onCompact: PropTypes.func,
  onExpand: PropTypes.func,
  isCompact: PropTypes.bool,
  add: PropTypes.node
};

DataListToolbar.defaultProps = {
  add: null,
  addUrl: null,
  deleteTooltip: i18nMark('Delete'),
  isAllSelected: false,
  isCompact: false,
  onCompact: null,
  onExpand: null,
  onSearch: null,
  onSelectAll: null,
  onSort: null,
  showAdd: false,
  showDelete: false,
  showSelectAll: false,
  sortOrder: 'ascending',
  sortedColumnKey: 'name',
  isAllSelected: false,
  onCompact: null,
  onExpand: null,
  isCompact: false,
  add: null,
  noLeftMargin: false
};

export default DataListToolbar;
