function ApplicationsStrings (BaseString) {
    BaseString.call(this, 'applications');

    const { t } = this;
    const ns = this.applications;

    ns.state = {
        LIST_BREADCRUMB_LABEL: t.s('APPLICATIONS'),
        ADD_BREADCRUMB_LABEL: t.s('CREATE APPLICATION'),
        EDIT_BREADCRUMB_LABEL: t.s('EDIT APPLICATION'),
        USER_LIST_BREADCRUMB_LABEL: t.s('TOKENS')
    };

    ns.tab = {
        DETAILS: t.s('Details'),
        USERS: t.s('Tokens')
    };

    ns.tooltips = {
        ADD: t.s('Create a new Application')
    };

    ns.add = {
        PANEL_TITLE: t.s('NEW APPLICATION')
    };

    ns.list = {
        PANEL_TITLE: t.s('APPLICATIONS'),
        ROW_ITEM_LABEL_EXPIRED: t.s('EXPIRATION'),
        ROW_ITEM_LABEL_ORGANIZATION: t.s('ORG'),
        ROW_ITEM_LABEL_MODIFIED: t.s('LAST MODIFIED')
    };

    ns.inputs = {
        ORGANIZATION_PLACEHOLDER: t.s('SELECT AN ORGANIZATION')
    };
}

ApplicationsStrings.$inject = ['BaseStringService'];

export default ApplicationsStrings;
