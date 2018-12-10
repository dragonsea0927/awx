import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { I18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Brand } from '@patternfly/react-core';

import TowerLogoHeader from '../../../images/tower-logo-header.svg';
import TowerLogoHeaderHover from '../../../images/tower-logo-header-hover.svg';

class TowerLogo extends Component {
  constructor (props) {
    super(props);

    this.state = { hover: false };
  }

  onClick = () => {
    const { history, onClick: handleClick } = this.props;

    if (!handleClick) return;

    history.push('/');

    handleClick();
  };

  onHover = () => {
    const { hover } = this.state;

    this.setState({ hover: !hover });
  };

  render () {
    const { hover } = this.state;
    const { onClick: handleClick } = this.props;

    let src = TowerLogoHeader;

    if (hover && handleClick) {
      src = TowerLogoHeaderHover;
    }

    return (
      <I18n>
        {({ i18n }) => (
          <Brand
            src={src}
            alt={i18n._(t`Tower Brand Image`)}
            onMouseOut={this.onHover}
            onMouseOver={this.onHover}
            onBlur={this.onHover}
            onFocus={this.onHover}
            onClick={this.onClick}
          />
        )}
      </I18n>
    );
  }
}

export default withRouter(TowerLogo);
