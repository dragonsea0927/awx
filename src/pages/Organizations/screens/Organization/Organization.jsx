import React, { Component } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Switch, Route, withRouter, Redirect } from 'react-router-dom';
import { Card, CardHeader, PageSection } from '@patternfly/react-core';
import CardCloseButton from '../../../../components/CardCloseButton';
import ContentError from '../../../../components/ContentError';
import OrganizationAccess from './OrganizationAccess';
import OrganizationDetail from './OrganizationDetail';
import OrganizationEdit from './OrganizationEdit';
import OrganizationNotifications from './OrganizationNotifications';
import OrganizationTeams from './OrganizationTeams';
import RoutedTabs from '../../../../components/Tabs/RoutedTabs';
import { OrganizationsAPI } from '../../../../api';

class Organization extends Component {
  constructor (props) {
    super(props);

    this.state = {
      organization: null,
      contentLoading: true,
      contentError: false,
      isInitialized: false,
      isNotifAdmin: false,
      isAuditorOfThisOrg: false,
      isAdminOfThisOrg: false,
    };
    this.loadOrganization = this.loadOrganization.bind(this);
    this.loadOrganizationAndRoles = this.loadOrganizationAndRoles.bind(this);
  }

  async componentDidMount () {
    await this.loadOrganizationAndRoles();
    this.setState({ isInitialized: true });
  }

  async componentDidUpdate (prevProps) {
    const { location } = this.props;
    if (location !== prevProps.location) {
      await this.loadOrganization();
    }
  }

  async loadOrganizationAndRoles () {
    const {
      match,
      setBreadcrumb,
    } = this.props;
    const id = parseInt(match.params.id, 10);

    this.setState({ contentError: false, contentLoading: true });
    try {
      const [{ data }, notifAdminRes, auditorRes, adminRes] = await Promise.all([
        OrganizationsAPI.readDetail(id),
        OrganizationsAPI.read({ page_size: 1, role_level: 'notification_admin_role' }),
        OrganizationsAPI.read({ id, role_level: 'auditor_role' }),
        OrganizationsAPI.read({ id, role_level: 'admin_role' }),
      ]);
      setBreadcrumb(data);
      this.setState({
        organization: data,
        isNotifAdmin: notifAdminRes.data.results.length > 0,
        isAuditorOfThisOrg: auditorRes.data.results.length > 0,
        isAdminOfThisOrg: adminRes.data.results.length > 0
      });
    } catch (err) {
      this.setState(({ contentError: true }));
    } finally {
      this.setState({ contentLoading: false });
    }
  }

  async loadOrganization () {
    const {
      match,
      setBreadcrumb,
    } = this.props;
    const id = parseInt(match.params.id, 10);

    this.setState({ contentError: false, contentLoading: true });
    try {
      const { data } = await OrganizationsAPI.readDetail(id);
      setBreadcrumb(data);
      this.setState({ organization: data });
    } catch (err) {
      this.setState(({ contentError: true }));
    } finally {
      this.setState({ contentLoading: false });
    }
  }

  render () {
    const {
      location,
      match,
      me,
      history,
      i18n
    } = this.props;

    const {
      organization,
      contentError,
      contentLoading,
      isInitialized,
      isNotifAdmin,
      isAuditorOfThisOrg,
      isAdminOfThisOrg
    } = this.state;

    const canSeeNotificationsTab = me.is_system_auditor || isNotifAdmin || isAuditorOfThisOrg;
    const canToggleNotifications = isNotifAdmin && (
      me.is_system_auditor
      || isAuditorOfThisOrg
      || isAdminOfThisOrg
    );

    const tabsArray = [
      { name: i18n._(t`Details`), link: `${match.url}/details`, id: 0 },
      { name: i18n._(t`Access`), link: `${match.url}/access`, id: 1 },
      { name: i18n._(t`Teams`), link: `${match.url}/teams`, id: 2 }
    ];

    if (canSeeNotificationsTab) {
      tabsArray.push({
        name: i18n._(t`Notifications`),
        link: `${match.url}/notifications`,
        id: 3
      });
    }

    let cardHeader = (
      <CardHeader style={{ padding: 0 }}>
        <React.Fragment>
          <div className="awx-orgTabs-container">
            <RoutedTabs
              match={match}
              history={history}
              labeltext={i18n._(t`Organization detail tabs`)}
              tabsArray={tabsArray}
            />
            <CardCloseButton linkTo="/organizations" />
            <div
              className="awx-orgTabs__bottom-border"
            />
          </div>
        </React.Fragment>
      </CardHeader>
    );

    if (!isInitialized) {
      cardHeader = null;
    }

    if (!match) {
      cardHeader = null;
    }

    if (location.pathname.endsWith('edit')) {
      cardHeader = null;
    }

    if (!contentLoading && contentError) {
      return (
        <PageSection>
          <Card className="awx-c-card">
            <ContentError />
          </Card>
        </PageSection>
      );
    }

    return (
      <PageSection>
        <Card className="awx-c-card">
          {cardHeader}
          <Switch>
            <Redirect
              from="/organizations/:id"
              to="/organizations/:id/details"
              exact
            />
            {organization && (
              <Route
                path="/organizations/:id/edit"
                render={() => (
                  <OrganizationEdit
                    match={match}
                    organization={organization}
                  />
                )}
              />
            )}
            {organization && (
              <Route
                path="/organizations/:id/details"
                render={() => (
                  <OrganizationDetail
                    match={match}
                    organization={organization}
                  />
                )}
              />
            )}
            {organization && (
              <Route
                path="/organizations/:id/access"
                render={() => (
                  <OrganizationAccess
                    organization={organization}
                  />
                )}
              />
            )}
            <Route
              path="/organizations/:id/teams"
              render={() => (
                <OrganizationTeams id={Number(match.params.id)} />
              )}
            />
            {canSeeNotificationsTab && (
              <Route
                path="/organizations/:id/notifications"
                render={() => (
                  <OrganizationNotifications
                    id={Number(match.params.id)}
                    canToggleNotifications={canToggleNotifications}
                  />
                )}
              />
            )}
          </Switch>
        </Card>
      </PageSection>
    );
  }
}

export default withI18n()(withRouter(Organization));
export { Organization as _Organization };
