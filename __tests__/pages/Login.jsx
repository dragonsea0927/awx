import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { mount, shallow } from 'enzyme';
import { I18nProvider } from '@lingui/react';
import { asyncFlush } from '../../jest.setup';
import AtLogin from '../../src/pages/Login';
import api from '../../src/api';

describe('<Login />', () => {
  let loginWrapper;
  let atLogin;
  let loginPage;
  let loginForm;
  let usernameInput;
  let passwordInput;
  let submitButton;
  let loginHeaderLogo;

  const findChildren = () => {
    atLogin = loginWrapper.find('AtLogin');
    loginPage = loginWrapper.find('LoginPage');
    loginForm = loginWrapper.find('LoginForm');
    usernameInput = loginWrapper.find('input#pf-login-username-id');
    passwordInput = loginWrapper.find('input#pf-login-password-id');
    submitButton = loginWrapper.find('Button[type="submit"]');
    loginHeaderLogo = loginWrapper.find('LoginHeaderBrand Brand');
  };

  beforeEach(() => {
    loginWrapper = mount(
      <MemoryRouter>
        <I18nProvider>
          <AtLogin />
        </I18nProvider>
      </MemoryRouter>
    );
    findChildren();
  });

  afterEach(() => {
    loginWrapper.unmount();
  });

  test('initially renders without crashing', () => {
    expect(loginWrapper.length).toBe(1);
    expect(loginPage.length).toBe(1);
    expect(loginForm.length).toBe(1);
    expect(usernameInput.length).toBe(1);
    expect(usernameInput.props().value).toBe('');
    expect(passwordInput.length).toBe(1);
    expect(passwordInput.props().value).toBe('');
    expect(atLogin.state().isValidPassword).toBe(true);
    expect(submitButton.length).toBe(1);
    expect(submitButton.props().isDisabled).toBe(false);
    expect(loginHeaderLogo.length).toBe(1);
  });

  test('custom logo renders Brand component with correct src and alt', () => {
    loginWrapper = mount(
      <MemoryRouter>
        <I18nProvider>
          <AtLogin logo="images/foo.jpg" alt="Foo Application" />
        </I18nProvider>
      </MemoryRouter>
    );
    findChildren();
    expect(loginHeaderLogo.length).toBe(1);
    expect(loginHeaderLogo.props().src).toBe('data:image/jpeg;images/foo.jpg');
    expect(loginHeaderLogo.props().alt).toBe('Foo Application');
  });

  test('default logo renders Brand component with correct src and alt', () => {
    loginWrapper = mount(
      <MemoryRouter>
        <I18nProvider>
          <AtLogin />
        </I18nProvider>
      </MemoryRouter>
    );
    findChildren();
    expect(loginHeaderLogo.length).toBe(1);
    expect(loginHeaderLogo.props().src).toBe('tower-logo-header.svg');
    expect(loginHeaderLogo.props().alt).toBe('Ansible Tower');
  });

  test('state maps to un/pw input value props', () => {
    atLogin.setState({ username: 'un', password: 'pw' });
    expect(atLogin.state().username).toBe('un');
    expect(atLogin.state().password).toBe('pw');
    findChildren();
    expect(usernameInput.props().value).toBe('un');
    expect(passwordInput.props().value).toBe('pw');
  });

  test('updating un/pw clears out error', () => {
    atLogin.setState({ isValidPassword: false });
    expect(loginWrapper.find('.pf-c-form__helper-text.pf-m-error').length).toBe(1);
    usernameInput.instance().value = 'uname';
    usernameInput.simulate('change');
    expect(atLogin.state().username).toBe('uname');
    expect(atLogin.state().isValidPassword).toBe(true);
    expect(loginWrapper.find('.pf-c-form__helper-text.pf-m-error').length).toBe(0);
    atLogin.setState({ isValidPassword: false });
    expect(loginWrapper.find('.pf-c-form__helper-text.pf-m-error').length).toBe(1);
    passwordInput.instance().value = 'pword';
    passwordInput.simulate('change');
    expect(atLogin.state().password).toBe('pword');
    expect(atLogin.state().isValidPassword).toBe(true);
    expect(loginWrapper.find('.pf-c-form__helper-text.pf-m-error').length).toBe(0);
  });

  test('api.login not called when loading', () => {
    api.login = jest.fn().mockImplementation(() => Promise.resolve({}));
    expect(atLogin.state().loading).toBe(false);
    atLogin.setState({ loading: true });
    submitButton.simulate('click');
    expect(api.login).toHaveBeenCalledTimes(0);
  });

  test('submit calls api.login successfully', async () => {
    api.login = jest.fn().mockImplementation(() => Promise.resolve({}));
    expect(atLogin.state().loading).toBe(false);
    atLogin.setState({ username: 'unamee', password: 'pwordd' });
    submitButton.simulate('click');
    expect(api.login).toHaveBeenCalledTimes(1);
    expect(api.login).toHaveBeenCalledWith('unamee', 'pwordd');
    expect(atLogin.state().loading).toBe(true);
    await asyncFlush();
    expect(atLogin.state().loading).toBe(false);
  });

  test('submit calls api.login handles 401 error', async () => {
    api.login = jest.fn().mockImplementation(() => {
      const err = new Error('401 error');
      err.response = { status: 401, message: 'problem' };
      return Promise.reject(err);
    });
    expect(atLogin.state().loading).toBe(false);
    expect(atLogin.state().isValidPassword).toBe(true);
    atLogin.setState({ username: 'unamee', password: 'pwordd' });
    submitButton.simulate('click');
    expect(api.login).toHaveBeenCalledTimes(1);
    expect(api.login).toHaveBeenCalledWith('unamee', 'pwordd');
    expect(atLogin.state().loading).toBe(true);
    await asyncFlush();
    expect(atLogin.state().isValidPassword).toBe(false);
    expect(atLogin.state().loading).toBe(false);
  });

  test('submit calls api.login handles non-401 error', async () => {
    api.login = jest.fn().mockImplementation(() => {
      const err = new Error('500 error');
      err.response = { status: 500, message: 'problem' };
      return Promise.reject(err);
    });
    expect(atLogin.state().loading).toBe(false);
    atLogin.setState({ username: 'unamee', password: 'pwordd' });
    submitButton.simulate('click');
    expect(api.login).toHaveBeenCalledTimes(1);
    expect(api.login).toHaveBeenCalledWith('unamee', 'pwordd');
    expect(atLogin.state().loading).toBe(true);
    await asyncFlush();
    expect(atLogin.state().loading).toBe(false);
  });

  test('render Redirect to / when already authenticated', () => {
    api.isAuthenticated = jest.fn();
    api.isAuthenticated.mockReturnValue(true);
    loginWrapper = shallow(<AtLogin />);
    const redirectElem = loginWrapper.find('Redirect');
    expect(redirectElem.length).toBe(1);
    expect(redirectElem.props().to).toBe('/');
  });
});
