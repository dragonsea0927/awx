import React from 'react';
import { createMemoryHistory } from 'history';
import { mountWithContexts } from '../../../testUtils/enzymeHelpers';
import WorkflowApprovals from './WorkflowApprovals';

describe('<WorkflowApprovals />', () => {
  test('initially renders succesfully', () => {
    mountWithContexts(<WorkflowApprovals />);
  });

  test('should display a breadcrumb heading', () => {
    const history = createMemoryHistory({
      initialEntries: ['/workflow_approvals'],
    });
    const match = {
      path: '/workflow_approvals',
      url: '/workflow_approvals',
      isExact: true,
    };

    const wrapper = mountWithContexts(<WorkflowApprovals />, {
      context: {
        router: {
          history,
          route: {
            location: history.location,
            match,
          },
        },
      },
    });
    expect(wrapper.find('BreadcrumbHeading').length).toBe(1);
    wrapper.unmount();
  });
});
