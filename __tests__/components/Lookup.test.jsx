import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@lingui/react';
import Lookup from '../../src/components/Lookup';

let mockData = [{ name: 'foo', id: 1, isChecked: false }];
const mockColumns = [
  { name: 'Name', key: 'name', isSortable: true }
];
describe('<Lookup />', () => {
  test('initially renders succesfully', () => {
    mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockData}
          onLookupSave={() => { }}
          getItems={() => { }}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    );
  });
  test('API response is formatted properly', (done) => {
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockData}
          onLookupSave={() => { }}
          getItems={() => ({ data: { results: [{ name: 'test instance', id: 1 }] } })}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    ).find('Lookup');

    setImmediate(() => {
      expect(wrapper.state().results).toEqual([{ id: 1, name: 'test instance' }]);
      done();
    });
  });
  test('Opens modal when search icon is clicked', () => {
    const spy = jest.spyOn(Lookup.prototype, 'handleModalToggle');
    const mockSelected = [{ name: 'foo', id: 1 }];
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          id="search"
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockSelected}
          onLookupSave={() => { }}
          getItems={() => { }}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    ).find('Lookup');
    expect(spy).not.toHaveBeenCalled();
    expect(wrapper.state('lookupSelectedItems')).toEqual(mockSelected);
    const searchItem = wrapper.find('.pf-c-input-group__text#search');
    searchItem.first().simulate('click');
    expect(spy).toHaveBeenCalled();
    expect(wrapper.state('lookupSelectedItems')).toEqual([{
      id: 1,
      name: 'foo'
    }]);
    expect(wrapper.state('isModalOpen')).toEqual(true);
  });
  test('calls "toggleSelected" when a user changes a checkbox', (done) => {
    const spy = jest.spyOn(Lookup.prototype, 'toggleSelected');
    const mockSelected = [{ name: 'foo', id: 1 }];
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          id="search"
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockSelected}
          onLookupSave={() => { }}
          getItems={() => ({ data: { results: [{ name: 'test instance', id: 1 }] } })}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    );
    setImmediate(() => {
      const searchItem = wrapper.find('.pf-c-input-group__text#search');
      searchItem.first().simulate('click');
      wrapper.find('input[type="checkbox"]').simulate('change');
      expect(spy).toHaveBeenCalled();
      done();
    });
  });
  test('calls "toggleSelected" when remove icon is clicked', () => {
    const spy = jest.spyOn(Lookup.prototype, 'toggleSelected');
    mockData = [{ name: 'foo', id: 1 }, { name: 'bar', id: 2 }];
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          id="search"
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockData}
          onLookupSave={() => { }}
          getItems={() => { }}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    );
    const removeIcon = wrapper.find('button[aria-label="close"]').first();
    removeIcon.simulate('click');
    expect(spy).toHaveBeenCalled();
  });
  test('renders chips from prop value', () => {
    mockData = [{ name: 'foo', id: 0 }, { name: 'bar', id: 1 }];
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          onLookupSave={() => { }}
          value={mockData}
          selected={[]}
          getItems={() => { }}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    ).find('Lookup');
    const chip = wrapper.find('li.pf-c-chip');
    expect(chip).toHaveLength(2);
  });
  test('toggleSelected successfully adds/removes row from lookupSelectedItems state', () => {
    mockData = [];
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          onLookupSave={() => { }}
          value={mockData}
          getItems={() => { }}
          columns={mockColumns}
          sortedColumnKey="name"
        />
      </I18nProvider>
    ).find('Lookup');
    wrapper.instance().toggleSelected({
      id: 1,
      name: 'foo'
    });
    expect(wrapper.state('lookupSelectedItems')).toEqual([{
      id: 1,
      name: 'foo'
    }]);
    wrapper.instance().toggleSelected({
      id: 1,
      name: 'foo'
    });
    expect(wrapper.state('lookupSelectedItems')).toEqual([]);
  });
  test('saveModal calls callback with selected items', () => {
    mockData = [];
    const onLookupSaveFn = jest.fn();
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          name="fooBar"
          value={mockData}
          onLookupSave={onLookupSaveFn}
          getItems={() => { }}
        />
      </I18nProvider>
    ).find('Lookup');
    wrapper.instance().toggleSelected({
      id: 1,
      name: 'foo'
    });
    expect(wrapper.state('lookupSelectedItems')).toEqual([{
      id: 1,
      name: 'foo'
    }]);
    wrapper.instance().saveModal();
    expect(onLookupSaveFn).toHaveBeenCalledWith([{
      id: 1,
      name: 'foo'
    }], 'fooBar');
  });
  test('onSort sets state and calls getData ', () => {
    const spy = jest.spyOn(Lookup.prototype, 'getData');
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          onLookupSave={() => { }}
          value={mockData}
          selected={[]}
          columns={mockColumns}
          sortedColumnKey="name"
          getItems={() => { }}
        />
      </I18nProvider>
    ).find('Lookup');
    wrapper.instance().onSort('id', 'descending');
    expect(wrapper.state('sortedColumnKey')).toEqual('id');
    expect(wrapper.state('sortOrder')).toEqual('descending');
    expect(spy).toHaveBeenCalled();
  });
  test('onSetPage sets state and calls getData ', () => {
    const spy = jest.spyOn(Lookup.prototype, 'getData');
    const wrapper = mount(
      <I18nProvider>
        <Lookup
          lookup_header="Foo Bar"
          onLookupSave={() => { }}
          value={mockData}
          selected={[]}
          columns={mockColumns}
          sortedColumnKey="name"
          getItems={() => { }}
        />
      </I18nProvider>
    ).find('Lookup');
    wrapper.instance().onSetPage(2, 10);
    expect(wrapper.state('page')).toEqual(2);
    expect(wrapper.state('page_size')).toEqual(10);
    expect(spy).toHaveBeenCalled();
  });
});
