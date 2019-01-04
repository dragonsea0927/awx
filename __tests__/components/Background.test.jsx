import React from 'react';
import { mount } from 'enzyme';

import { I18nProvider } from '@lingui/react';
import Background from '../../src/components/Background';

describe('Background', () => {
  test('renders the expected content', () => {
      const wrapper = mount(<Background><div id="test"/></Background>);
      expect(wrapper).toHaveLength(1);
      expect(wrapper.find('BackgroundImage')).toHaveLength(1);
      expect(wrapper.find('#test')).toHaveLength(1);
  });
});
