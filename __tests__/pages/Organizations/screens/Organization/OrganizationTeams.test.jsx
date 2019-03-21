import React from 'react';
import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';

import OrganizationTeams from '../../../../../src/pages/Organizations/screens/Organization/OrganizationTeams';

const mockAPITeamsList = {
  foo: 'bar',
};

const mockGetOrganizationTeamsList = () => Promise.resolve(mockAPITeamsList);

describe('<OrganizationTeams />', () => {
  test('initially renders succesfully', () => {
    mount(
      <MemoryRouter initialEntries={['/organizations/1']} initialIndex={0}>
        <OrganizationTeams
          match={{ path: '/organizations/:id/teams', url: '/organizations/1/teams', params: { id: 1 } }}
          location={{ search: '', pathname: '/organizations/1/teams' }}
          params={{}}
          api={{
            getOrganizationTeamsList: jest.fn(),
          }}
        />
      </MemoryRouter>
    );
  });

  test('passed methods as props are called appropriately', async () => {
    const wrapper = mount(
      <MemoryRouter initialEntries={['/organizations/1']} initialIndex={0}>
        <OrganizationTeams
          match={{ path: '/organizations/:id/teams', url: '/organizations/1/teams', params: { id: 1 } }}
          location={{ search: '', pathname: '/organizations/1/teams' }}
          params={{}}
          api={{
            getOrganizationTeamsList: mockGetOrganizationTeamsList
          }}
        />
      </MemoryRouter>
    ).find('OrganizationTeams');
    const teamsList = await wrapper.instance().getOrgTeamsList();
    expect(teamsList).toEqual(mockAPITeamsList);
  });
});
