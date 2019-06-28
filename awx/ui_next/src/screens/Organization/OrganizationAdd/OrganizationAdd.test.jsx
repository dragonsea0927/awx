import React from 'react';

import {
  mountWithContexts,
  waitForElement,
} from '../../../../testUtils/enzymeHelpers';

import OrganizationAdd from './OrganizationAdd';
import { OrganizationsAPI } from '../../../api';

jest.mock('../../../api');

describe('<OrganizationAdd />', () => {
  test('handleSubmit should post to api', () => {
    const wrapper = mountWithContexts(<OrganizationAdd />);
    const updatedOrgData = {
      name: 'new name',
      description: 'new description',
      custom_virtualenv: 'Buzz',
    };
    wrapper.find('OrganizationForm').prop('handleSubmit')(
      updatedOrgData,
      [],
      []
    );
    expect(OrganizationsAPI.create).toHaveBeenCalledWith(updatedOrgData);
  });

  test('should navigate to organizations list when cancel is clicked', () => {
    const history = {
      push: jest.fn(),
    };
    const wrapper = mountWithContexts(<OrganizationAdd />, {
      context: { router: { history } },
    });
    expect(history.push).not.toHaveBeenCalled();
    wrapper.find('button[aria-label="Cancel"]').prop('onClick')();
    expect(history.push).toHaveBeenCalledWith('/organizations');
  });

  test('should navigate to organizations list when close (x) is clicked', () => {
    const history = {
      push: jest.fn(),
    };
    const wrapper = mountWithContexts(<OrganizationAdd />, {
      context: { router: { history } },
    });
    expect(history.push).not.toHaveBeenCalled();
    wrapper.find('button[aria-label="Close"]').prop('onClick')();
    expect(history.push).toHaveBeenCalledWith('/organizations');
  });

  test('successful form submission should trigger redirect', async done => {
    const history = {
      push: jest.fn(),
    };
    const orgData = {
      name: 'new name',
      description: 'new description',
      custom_virtualenv: 'Buzz',
    };
    OrganizationsAPI.create.mockResolvedValueOnce({
      data: {
        id: 5,
        related: {
          instance_groups: '/bar',
        },
        ...orgData,
      },
    });
    const wrapper = mountWithContexts(<OrganizationAdd />, {
      context: { router: { history } },
    });
    await waitForElement(wrapper, 'button[aria-label="Save"]');
    await wrapper.find('OrganizationForm').prop('handleSubmit')(
      orgData,
      [3],
      []
    );
    expect(history.push).toHaveBeenCalledWith('/organizations/5');
    done();
  });

  test('handleSubmit should post instance groups', async done => {
    const orgData = {
      name: 'new name',
      description: 'new description',
      custom_virtualenv: 'Buzz',
    };
    OrganizationsAPI.create.mockResolvedValueOnce({
      data: {
        id: 5,
        related: {
          instance_groups: '/api/v2/organizations/5/instance_groups',
        },
        ...orgData,
      },
    });
    const wrapper = mountWithContexts(<OrganizationAdd />);
    await waitForElement(wrapper, 'button[aria-label="Save"]');
    await wrapper.find('OrganizationForm').prop('handleSubmit')(
      orgData,
      [3],
      []
    );
    expect(OrganizationsAPI.associateInstanceGroup).toHaveBeenCalledWith(5, 3);
    done();
  });

  test('AnsibleSelect component renders if there are virtual environments', () => {
    const config = {
      custom_virtualenvs: ['foo', 'bar'],
    };
    const wrapper = mountWithContexts(<OrganizationAdd />, {
      context: { config },
    }).find('AnsibleSelect');
    expect(wrapper.find('FormSelect')).toHaveLength(1);
    expect(wrapper.find('FormSelectOption')).toHaveLength(3);
    expect(
      wrapper
        .find('FormSelectOption')
        .first()
        .prop('value')
    ).toEqual('/venv/ansible/');
  });

  test('AnsibleSelect component does not render if there are 0 virtual environments', () => {
    const config = {
      custom_virtualenvs: [],
    };
    const wrapper = mountWithContexts(<OrganizationAdd />, {
      context: { config },
    }).find('AnsibleSelect');
    expect(wrapper.find('FormSelect')).toHaveLength(0);
  });
});
