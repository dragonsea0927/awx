import React from 'react';
import { act } from 'react-dom/test-utils';
import { CredentialsAPI } from '@api';
import { mountWithContexts, waitForElement } from '@testUtils/enzymeHelpers';
import { CredentialList } from '.';
import { mockCredentials } from '../shared';

jest.mock('@api');

describe('<CredentialList />', () => {
  let wrapper;

  beforeEach(async () => {
    CredentialsAPI.read.mockResolvedValueOnce({ data: mockCredentials });
    CredentialsAPI.readOptions.mockResolvedValue({
      data: {
        actions: {
          GET: {},
          POST: {},
        },
      },
    });

    await act(async () => {
      wrapper = mountWithContexts(<CredentialList />);
    });

    await waitForElement(wrapper, 'ContentLoading', el => el.length === 0);
  });

  afterEach(() => {
    jest.clearAllMocks();
    wrapper.unmount();
  });

  test('initially renders successfully', () => {
    expect(wrapper.find('CredentialList').length).toBe(1);
  });

  test('should fetch credentials from api and render the in the list', () => {
    expect(CredentialsAPI.read).toHaveBeenCalled();
    expect(wrapper.find('CredentialListItem').length).toBe(5);
  });

  test('should show content error if credentials are not successfully fetched from api', async () => {
    CredentialsAPI.readOptions.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );
    await act(async () => {
      wrapper = mountWithContexts(<CredentialList />);
    });
    await waitForElement(wrapper, 'ContentError', el => el.length === 1);
  });

  test('should check and uncheck the row item', async () => {
    expect(
      wrapper.find('PFDataListCheck[id="select-credential-1"]').props().checked
    ).toBe(false);
    await act(async () => {
      wrapper
        .find('PFDataListCheck[id="select-credential-1"]')
        .invoke('onChange')(true);
    });
    wrapper.update();
    expect(
      wrapper.find('PFDataListCheck[id="select-credential-1"]').props().checked
    ).toBe(true);
    await act(async () => {
      wrapper
        .find('PFDataListCheck[id="select-credential-1"]')
        .invoke('onChange')(false);
    });
    wrapper.update();
    expect(
      wrapper.find('PFDataListCheck[id="select-credential-1"]').props().checked
    ).toBe(false);
  });

  test('should check all row items when select all is checked', async () => {
    wrapper.find('PFDataListCheck').forEach(el => {
      expect(el.props().checked).toBe(false);
    });
    await act(async () => {
      wrapper.find('Checkbox#select-all').invoke('onChange')(true);
    });
    wrapper.update();
    wrapper.find('PFDataListCheck').forEach(el => {
      expect(el.props().checked).toBe(true);
    });
    await act(async () => {
      wrapper.find('Checkbox#select-all').invoke('onChange')(false);
    });
    wrapper.update();
    wrapper.find('PFDataListCheck').forEach(el => {
      expect(el.props().checked).toBe(false);
    });
  });

  test('should call api delete credentials for each selected credential', async () => {
    CredentialsAPI.read.mockResolvedValueOnce({ data: mockCredentials });
    CredentialsAPI.destroy = jest.fn();

    await act(async () => {
      wrapper
        .find('PFDataListCheck[id="select-credential-3"]')
        .invoke('onChange')();
    });
    wrapper.update();
    await act(async () => {
      wrapper.find('ToolbarDeleteButton').invoke('onDelete')();
    });
    wrapper.update();
    expect(CredentialsAPI.destroy).toHaveBeenCalledTimes(1);
  });

  test('should show error modal when credential is not successfully deleted from api', async () => {
    CredentialsAPI.destroy.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );
    await act(async () => {
      wrapper
        .find('PFDataListCheck[id="select-credential-2"]')
        .invoke('onChange')();
    });
    wrapper.update();
    await act(async () => {
      wrapper.find('ToolbarDeleteButton').invoke('onDelete')();
    });
    await waitForElement(
      wrapper,
      'Modal',
      el => el.props().isOpen === true && el.props().title === 'Error!'
    );
    await act(async () => {
      wrapper.find('ModalBoxCloseButton').invoke('onClose')();
    });
    await waitForElement(wrapper, 'Modal', el => el.props().isOpen === false);
  });
});
