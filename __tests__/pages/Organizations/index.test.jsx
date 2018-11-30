import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';
import Organizations from '../../../src/pages/Organizations/index';

describe('<Organizations />', () => {
  test('initially renders succesfully', () => {
    mount(
      <MemoryRouter initialEntries={['/organizations']} initialIndex={0}>
        <Organizations
          match={{ path: '/organizations', route: '/organizations', link: 'organizations' }}
          location={{ search: '', pathname: '/organizations' }}
        />
      </MemoryRouter>
    );
  });
});
