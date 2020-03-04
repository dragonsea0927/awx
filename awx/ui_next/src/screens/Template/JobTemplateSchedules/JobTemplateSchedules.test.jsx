import React from 'react';
import { mountWithContexts } from '@testUtils/enzymeHelpers';
import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';
import JobTemplateSchedules from './JobTemplateSchedules';

describe('<JobTemplateSchedules />', () => {
  test('initially renders successfully', async () => {
    let wrapper;
    const history = createMemoryHistory({
      initialEntries: ['/templates/job_template/1/schedules'],
    });
    const jobTemplate = { id: 1, name: 'Mock JT' };

    await act(async () => {
      wrapper = mountWithContexts(
        <JobTemplateSchedules
          setBreadcrumb={() => {}}
          jobTemplate={jobTemplate}
        />,

        {
          context: {
            router: { history, route: { location: history.location } },
          },
        }
      );
    });
    expect(wrapper.length).toBe(1);
  });
});
