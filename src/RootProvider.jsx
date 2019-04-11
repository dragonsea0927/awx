import React, { Component } from 'react';
import {
  I18nProvider,
} from '@lingui/react';

import {
  HashRouter
} from 'react-router-dom';

import { NetworkProvider } from './contexts/Network';
import { RootDialogProvider } from './contexts/RootDialog';
import { ConfigProvider } from './contexts/Config';

import ja from '../build/locales/ja/messages';
import en from '../build/locales/en/messages';

export function getLanguage (nav) {
  const language = (nav.languages && nav.languages[0]) || nav.language || nav.userLanguage;
  const languageWithoutRegionCode = language.toLowerCase().split(/[_-]+/)[0];

  return languageWithoutRegionCode;
}

class RootProvider extends Component {
  render () {
    const { children } = this.props;

    const catalogs = { en, ja };
    const language = getLanguage(navigator);

    return (
      <HashRouter>
        <I18nProvider
          language={language}
          catalogs={catalogs}
        >
          <RootDialogProvider>
            <NetworkProvider>
              <ConfigProvider>
                {children}
              </ConfigProvider>
            </NetworkProvider>
          </RootDialogProvider>
        </I18nProvider>
      </HashRouter>
    );
  }
}

export default RootProvider;
