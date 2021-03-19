import React, { useCallback, useEffect } from 'react';
import { Redirect, withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik } from 'formik';
import styled from 'styled-components';
import sanitizeHtml from 'sanitize-html';
import {
  Brand,
  LoginMainFooterLinksItem,
  LoginForm,
  Login as PFLogin,
  LoginHeader,
  LoginFooter,
  LoginMainHeader,
  LoginMainBody,
  LoginMainFooter,
  Tooltip,
} from '@patternfly/react-core';

import {
  AzureIcon,
  GoogleIcon,
  GithubIcon,
  UserCircleIcon,
} from '@patternfly/react-icons';
import useRequest, { useDismissableError } from '../../util/useRequest';
import { AuthAPI, RootAPI } from '../../api';
import AlertModal from '../../components/AlertModal';
import ErrorDetail from '../../components/ErrorDetail';

const loginLogoSrc = '/static/media/logo-login.svg';

const Login = styled(PFLogin)`
  & .pf-c-brand {
    max-height: 285px;
  }
`;

function AWXLogin({ alt, i18n, isAuthenticated }) {
  const {
    isLoading: isCustomLoginInfoLoading,
    error: customLoginInfoError,
    request: fetchCustomLoginInfo,
    result: { brandName, logo, loginInfo, socialAuthOptions },
  } = useRequest(
    useCallback(async () => {
      const [
        {
          data: { custom_logo, custom_login_info },
        },
        {
          data: { BRAND_NAME },
        },
        { data: authData },
      ] = await Promise.all([
        RootAPI.read(),
        RootAPI.readAssetVariables(),
        AuthAPI.read(),
      ]);
      const logoSrc = custom_logo
        ? `data:image/jpeg;${custom_logo}`
        : loginLogoSrc;
      return {
        brandName: BRAND_NAME,
        logo: logoSrc,
        loginInfo: custom_login_info,
        socialAuthOptions: authData,
      };
    }, []),
    {
      brandName: null,
      logo: loginLogoSrc,
      loginInfo: null,
      socialAuthOptions: {},
    }
  );

  const {
    error: loginInfoError,
    dismissError: dismissLoginInfoError,
  } = useDismissableError(customLoginInfoError);

  useEffect(() => {
    fetchCustomLoginInfo();
  }, [fetchCustomLoginInfo]);

  const {
    isLoading: isAuthenticating,
    error: authenticationError,
    request: authenticate,
  } = useRequest(
    useCallback(async ({ username, password }) => {
      await RootAPI.login(username, password);
    }, [])
  );

  const {
    error: authError,
    dismissError: dismissAuthError,
  } = useDismissableError(authenticationError);

  const handleSubmit = async values => {
    dismissAuthError();
    await authenticate(values);
  };

  if (isCustomLoginInfoLoading) {
    return null;
  }

  if (isAuthenticated(document.cookie)) {
    return <Redirect to="/" />;
  }

  let helperText;
  if (authError?.response?.status === 401) {
    helperText = i18n._(t`Invalid username or password. Please try again.`);
  } else {
    helperText = i18n._(t`There was a problem signing in. Please try again.`);
  }

  const HeaderBrand = (
    <Brand data-cy="brand-logo" src={logo} alt={alt || brandName} />
  );
  const Header = <LoginHeader headerBrand={HeaderBrand} />;
  const Footer = (
    <LoginFooter
      data-cy="login-footer"
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(loginInfo),
      }}
    />
  );

  return (
    <Login header={Header} footer={Footer}>
      <LoginMainHeader
        data-cy="login-header"
        title={
          brandName
            ? i18n._(t`Welcome to Ansible ${brandName}! Please Sign In.`)
            : ''
        }
      />
      <LoginMainBody>
        <Formik
          initialValues={{
            password: '',
            username: '',
          }}
          onSubmit={handleSubmit}
        >
          {formik => (
            <LoginForm
              data-cy="login-form"
              className={authError ? 'pf-m-error' : ''}
              helperText={helperText}
              isLoginButtonDisabled={isAuthenticating}
              isValidPassword={!authError}
              isValidUsername={!authError}
              loginButtonLabel={i18n._(t`Log In`)}
              onChangePassword={val => {
                formik.setFieldValue('password', val);
                dismissAuthError();
              }}
              onChangeUsername={val => {
                formik.setFieldValue('username', val);
                dismissAuthError();
              }}
              onLoginButtonClick={formik.handleSubmit}
              passwordLabel={i18n._(t`Password`)}
              passwordValue={formik.values.password}
              showHelperText={authError}
              usernameLabel={i18n._(t`Username`)}
              usernameValue={formik.values.username}
            />
          )}
        </Formik>
        {loginInfoError && (
          <AlertModal
            isOpen={loginInfoError}
            variant="error"
            title={i18n._(t`Error!`)}
            onClose={dismissLoginInfoError}
            data-cy="login-info-error"
          >
            {i18n._(
              t`Failed to fetch custom login configuration settings.  System defaults will be shown instead.`
            )}
            <ErrorDetail error={loginInfoError} />
          </AlertModal>
        )}
      </LoginMainBody>
      <LoginMainFooter
        socialMediaLoginContent={
          <>
            {socialAuthOptions &&
              Object.keys(socialAuthOptions).map(authKey => {
                const loginUrl = socialAuthOptions[authKey].login_url;
                if (authKey === 'azuread-oauth2') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-azure"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip content={i18n._(t`Sign in with Azure AD`)}>
                        <AzureIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip content={i18n._(t`Sign in with GitHub`)}>
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github-org') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github-org"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip
                        content={i18n._(t`Sign in with GitHub Organizations`)}
                      >
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github-team') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github-team"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip content={i18n._(t`Sign in with GitHub Teams`)}>
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github-enterprise') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github-enterprise"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip
                        content={i18n._(t`Sign in with GitHub Enterprise`)}
                      >
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github-enterprise-org') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github-enterprise-org"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip
                        content={i18n._(
                          t`Sign in with GitHub Enterprise Organizations`
                        )}
                      >
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'github-enterprise-team') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-github-enterprise-team"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip
                        content={i18n._(
                          t`Sign in with GitHub Enterprise Teams`
                        )}
                      >
                        <GithubIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey === 'google-oauth2') {
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-google"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip content={i18n._(t`Sign in with Google`)}>
                        <GoogleIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }
                if (authKey.startsWith('saml')) {
                  const samlIDP = authKey.split(':')[1] || null;
                  return (
                    <LoginMainFooterLinksItem
                      data-cy="social-auth-saml"
                      href={loginUrl}
                      key={authKey}
                    >
                      <Tooltip
                        content={
                          samlIDP
                            ? i18n._(t`Sign in with SAML ${samlIDP}`)
                            : i18n._(t`Sign in with SAML`)
                        }
                      >
                        <UserCircleIcon />
                      </Tooltip>
                    </LoginMainFooterLinksItem>
                  );
                }

                return null;
              })}
          </>
        }
      />
    </Login>
  );
}

export default withI18n()(withRouter(AWXLogin));
export { AWXLogin as _AWXLogin };
