import React from 'react';
import { mount } from 'enzyme';
import ManagementJobs from '../../../src/pages/ManagementJobs';

describe('<ManagementJobs />', () => {
  let pageWrapper;
  let pageSections;
  let title;

  beforeEach(() => {
    pageWrapper = mount(<ManagementJobs />);
    pageSections = pageWrapper.find('PageSection');
    title = pageWrapper.find('Title');
  });

  afterEach(() => {
    pageWrapper.unmount();
  });

  test('initially renders without crashing', () => {
    expect(pageWrapper.length).toBe(1);
    expect(pageSections.length).toBe(2);
    expect(title.length).toBe(1);
    expect(title.props().size).toBe('2xl');
    pageSections.forEach(section => {
      expect(section.props().variant).toBeDefined();
    });
  });
});
