import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@lingui/react';
import About from '../../src/components/About';

describe('<About />', () => {
  let aboutWrapper;
  let closeButton;

  test('initially renders without crashing', () => {
    aboutWrapper = mount(
      <I18nProvider>
        <About isOpen />
      </I18nProvider>
    );
    expect(aboutWrapper.length).toBe(1);
    aboutWrapper.unmount();
  });

  test('close button calls onClose handler', () => {
    const onClose = jest.fn();
    aboutWrapper = mount(
      <I18nProvider>
        <About isOpen onClose={onClose} />
      </I18nProvider>
    );
    closeButton = aboutWrapper.find('AboutModalBoxCloseButton Button');
    closeButton.simulate('click');
    expect(onClose).toBeCalled();
    aboutWrapper.unmount();
  });
});
