import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';

import { t } from '@lingui/macro';
import { Card, PageSection } from '@patternfly/react-core';

import { InventoriesAPI } from '@api';
import AlertModal from '@components/AlertModal';
import DatalistToolbar from '@components/DataListToolbar';
import ErrorDetail from '@components/ErrorDetail';
import PaginatedDataList, {
  ToolbarDeleteButton,
} from '@components/PaginatedDataList';

import { getQSConfig, parseQueryString } from '@util/qs';
import AddDropDownButton from '@components/AddDropDownButton';
import InventoryListItem from './InventoryListItem';

const QS_CONFIG = getQSConfig('inventory', {
  page: 1,
  page_size: 20,
  order_by: 'name',
});

class InventoriesList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasContentLoading: true,
      contentError: null,
      deletionError: null,
      selected: [],
      inventories: [],
      itemCount: 0,
    };

    this.loadInventories = this.loadInventories.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleInventoryDelete = this.handleInventoryDelete.bind(this);
    this.handleDeleteErrorClose = this.handleDeleteErrorClose.bind(this);
  }

  componentDidMount() {
    this.loadInventories();
  }

  componentDidUpdate(prevProps) {
    const { location } = this.props;

    if (location !== prevProps.location) {
      this.loadInventories();
    }
  }

  handleDeleteErrorClose() {
    this.setState({ deletionError: null });
  }

  handleSelectAll(isSelected) {
    const { inventories } = this.state;
    const selected = isSelected ? [...inventories] : [];
    this.setState({ selected });
  }

  handleSelect(inventory) {
    const { selected } = this.state;
    if (selected.some(s => s.id === inventory.id)) {
      this.setState({ selected: selected.filter(s => s.id !== inventory.id) });
    } else {
      this.setState({ selected: selected.concat(inventory) });
    }
  }

  async handleInventoryDelete() {
    const { selected, itemCount } = this.state;

    this.setState({ hasContentLoading: true });
    try {
      await Promise.all(
        selected.map(({ id }) => {
          return InventoriesAPI.destroy(id);
        })
      );
      this.setState({ itemCount: itemCount - selected.length });
    } catch (err) {
      this.setState({ deletionError: err });
    } finally {
      await this.loadInventories();
    }
  }

  async loadInventories() {
    const { location } = this.props;
    const { actions: cachedActions } = this.state;
    const params = parseQueryString(QS_CONFIG, location.search);

    let optionsPromise;
    if (cachedActions) {
      optionsPromise = Promise.resolve({ data: { actions: cachedActions } });
    } else {
      optionsPromise = InventoriesAPI.readOptions();
    }

    const promises = Promise.all([InventoriesAPI.read(params), optionsPromise]);

    this.setState({ contentError: null, hasContentLoading: true });

    try {
      const [
        {
          data: { count, results },
        },
        {
          data: { actions },
        },
      ] = await promises;

      this.setState({
        actions,
        itemCount: count,
        inventories: results,
        selected: [],
      });
    } catch (err) {
      this.setState({ contentError: err });
    } finally {
      this.setState({ hasContentLoading: false });
    }
  }

  render() {
    const {
      contentError,
      hasContentLoading,
      deletionError,
      inventories,
      itemCount,
      selected,
      actions,
    } = this.state;
    const { match, i18n } = this.props;
    const canAdd =
      actions && Object.prototype.hasOwnProperty.call(actions, 'POST');
    const isAllSelected =
      selected.length === inventories.length && selected.length !== 0;
    const addButton = (
      <AddDropDownButton
        key="add"
        dropdownItems={[
          {
            label: i18n._(t`Inventory`),
            url: `${match.url}/inventory/add/`,
          },
          {
            label: i18n._(t`Smart Inventory`),
            url: `${match.url}/smart_inventory/add/`,
          },
        ]}
      />
    );
    return (
      <PageSection>
        <Card>
          <PaginatedDataList
            contentError={contentError}
            hasContentLoading={hasContentLoading}
            items={inventories}
            itemCount={itemCount}
            pluralizedItemName={i18n._(t`Inventories`)}
            qsConfig={QS_CONFIG}
            onRowClick={this.handleSelect}
            toolbarSearchColumns={[
              {
                name: i18n._(t`Name`),
                key: 'name',
                isDefault: true,
              },
              {
                name: i18n._(t`Created By (Username)`),
                key: 'created_by__username',
              },
              {
                name: i18n._(t`Modified By (Username)`),
                key: 'modified_by__username',
              },
            ]}
            toolbarSortColumns={[
              {
                name: i18n._(t`Name`),
                key: 'name',
              },
            ]}
            renderToolbar={props => (
              <DatalistToolbar
                {...props}
                showSelectAll
                showExpandCollapse
                isAllSelected={isAllSelected}
                onSelectAll={this.handleSelectAll}
                qsConfig={QS_CONFIG}
                additionalControls={[
                  ...(canAdd ? [addButton] : []),
                  <ToolbarDeleteButton
                    key="delete"
                    onDelete={this.handleInventoryDelete}
                    itemsToDelete={selected}
                    pluralizedItemName="Inventories"
                  />,
                ]}
              />
            )}
            renderItem={inventory => (
              <InventoryListItem
                key={inventory.id}
                value={inventory.name}
                inventory={inventory}
                detailUrl={
                  inventory.kind === 'smart'
                    ? `${match.url}/smart_inventory/${inventory.id}/details`
                    : `${match.url}/inventory/${inventory.id}/details`
                }
                onSelect={() => this.handleSelect(inventory)}
                isSelected={selected.some(row => row.id === inventory.id)}
              />
            )}
            emptyStateControls={canAdd && addButton}
          />
        </Card>
        <AlertModal
          isOpen={deletionError}
          variant="error"
          title={i18n._(t`Error!`)}
          onClose={this.handleDeleteErrorClose}
        >
          {i18n._(t`Failed to delete one or more inventories.`)}
          <ErrorDetail error={deletionError} />
        </AlertModal>
      </PageSection>
    );
  }
}

export { InventoriesList as _InventoriesList };
export default withI18n()(withRouter(InventoriesList));
