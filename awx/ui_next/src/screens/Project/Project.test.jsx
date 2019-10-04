import React from 'react';

import { OrganizationsAPI, ProjectsAPI } from '@api';
import { mountWithContexts, waitForElement } from '@testUtils/enzymeHelpers';

import mockOrganization from '@util/data.organization.json';
import mockDetails from './data.project.json';

import Project from './Project';

jest.mock('@api');

const mockMe = {
  is_super_user: true,
  is_system_auditor: false,
};

async function getOrganizations() {
  return {
    count: 1,
    next: null,
    previous: null,
    data: {
      results: [mockOrganization],
    },
  };
}

describe.only('<Project />', () => {
  test('initially renders succesfully', () => {
    ProjectsAPI.readDetail.mockResolvedValue({ data: mockDetails });
    OrganizationsAPI.read.mockImplementation(getOrganizations);
    mountWithContexts(<Project setBreadcrumb={() => {}} me={mockMe} />);
  });

  test('notifications tab shown for admins', async done => {
    ProjectsAPI.readDetail.mockResolvedValue({ data: mockDetails });
    OrganizationsAPI.read.mockImplementation(getOrganizations);

    const wrapper = mountWithContexts(
      <Project setBreadcrumb={() => {}} me={mockMe} />
    );
    const tabs = await waitForElement(
      wrapper,
      '.pf-c-tabs__item',
      el => el.length === 5
    );
    expect(tabs.at(2).text()).toEqual('Notifications');
    done();
  });

  test('notifications tab hidden with reduced permissions', async done => {
    ProjectsAPI.readDetail.mockResolvedValue({ data: mockDetails });
    OrganizationsAPI.read.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      data: { results: [] },
    });

    const wrapper = mountWithContexts(
      <Project setBreadcrumb={() => {}} me={mockMe} />
    );
    const tabs = await waitForElement(
      wrapper,
      '.pf-c-tabs__item',
      el => el.length === 4
    );
    tabs.forEach(tab => expect(tab.text()).not.toEqual('Notifications'));
    done();
  });
});
