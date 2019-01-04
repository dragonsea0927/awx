import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { t } from '@lingui/macro';
import { I18n } from '@lingui/react';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  DropdownPosition,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  QuestionCircleIcon,
  UserIcon,
} from '@patternfly/react-icons';

const DOCLINK = 'https://docs.ansible.com/ansible-tower/latest/html/userguide/index.html';
const KEY_ENTER = 13;

class PageHeaderToolbar extends Component {
  constructor (props) {
    super(props);
    this.state = { isHelpOpen: false, isUserOpen: false };

    this.onHelpSelect = this.onHelpSelect.bind(this);
    this.onHelpToggle = this.onHelpToggle.bind(this);
    this.onLogoutKeyDown = this.onLogoutKeyDown.bind(this);
    this.onUserSelect = this.onUserSelect.bind(this);
    this.onUserToggle = this.onUserToggle.bind(this);
  }

  onLogoutKeyDown ({ keyCode }) {
    const { onLogoutClick } = this.props;

    if (keyCode === KEY_ENTER) {
      onLogoutClick();
    }
  }

  onHelpSelect () {
    const { isHelpOpen } = this.state;

    this.setState({ isHelpOpen: !isHelpOpen });
  }

  onUserSelect () {
    const { isUserOpen } = this.state;

    this.setState({ isUserOpen: !isUserOpen });
  }

  onHelpToggle (isOpen) {
    this.setState({ isHelpOpen: isOpen });
  }

  onUserToggle (isOpen) {
    this.setState({ isUserOpen: isOpen });
  }

  render () {
    const { isHelpOpen, isUserOpen } = this.state;
    const { isAboutDisabled, onAboutClick, onLogoutClick } = this.props;

    return (
      <I18n>
        {({ i18n }) => (
          <Toolbar>
            <ToolbarGroup>
              <ToolbarItem>
                <Dropdown
                  isOpen={isHelpOpen}
                  position={DropdownPosition.right}
                  onSelect={this.onHelpSelect}
                  toggle={(
                    <DropdownToggle
                      onToggle={this.onHelpToggle}
                    >
                      <QuestionCircleIcon />
                    </DropdownToggle>
                  )}
                  dropdownItems={[
                    <DropdownItem
                      key="help"
                      target="_blank"
                      href={DOCLINK}
                    >
                      {i18n._(t`Help`)}
                    </DropdownItem>,
                    <DropdownItem
                      key="about"
                      component="button"
                      isDisabled={isAboutDisabled}
                      onClick={onAboutClick}
                    >
                      {i18n._(t`About`)}
                    </DropdownItem>
                  ]}
                />
              </ToolbarItem>
              <ToolbarItem>
                <Dropdown
                  isOpen={isUserOpen}
                  position={DropdownPosition.right}
                  onSelect={this.onUserSelect}
                  toggle={(
                    <DropdownToggle
                      onToggle={this.onUserToggle}
                    >
                      <UserIcon />
                    </DropdownToggle>
                  )}
                  dropdownItems={[
                    <DropdownItem key="user">
                      <Link to="/home">
                        {i18n._(t`User Details`)}
                      </Link>
                    </DropdownItem>,
                    <DropdownItem
                      key="logout"
                      component="button"
                      onClick={onLogoutClick}
                      onKeyDown={this.onLogoutKeyDown}
                    >
                      {i18n._(t`Logout`)}
                    </DropdownItem>
                  ]}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </Toolbar>
        )}
      </I18n>
    );
  }
}

export default PageHeaderToolbar;
