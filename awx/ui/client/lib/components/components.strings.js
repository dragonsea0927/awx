function ComponentsStrings (BaseString) {
    BaseString.call(this, 'components');

    const { t } = this;
    const ns = this.components;

    ns.REPLACE = t.s('REPLACE');
    ns.REVERT = t.s('REVERT');
    ns.ENCRYPTED = t.s('ENCRYPTED');
    ns.OPTIONS = t.s('OPTIONS');
    ns.SHOW = t.s('SHOW');
    ns.HIDE = t.s('HIDE');

    ns.message = {
        REQUIRED_INPUT_MISSING: t.s('Please enter a value.'),
        INVALID_INPUT: t.s('Invalid input for this type.')
    };

    ns.file = {
        PLACEHOLDER: t.s('CHOOSE A FILE')
    };

    ns.form = {
        SUBMISSION_ERROR_TITLE: t.s('Unable to Submit'),
        SUBMISSION_ERROR_MESSAGE: t.s('Unexpected server error. View the console for more information'),
        SUBMISSION_ERROR_PREFACE: t.s('Unexpected Error')
    };

    ns.group = {
        UNSUPPORTED_ERROR_PREFACE: t.s('Unsupported input type')
    };

    ns.label = {
        PROMPT_ON_LAUNCH: t.s('Prompt on launch')
    };

    ns.select = {
        UNSUPPORTED_TYPE_ERROR: t.s('Unsupported display model type'),
        EMPTY_PLACEHOLDER: t.s('NO OPTIONS AVAILABLE')
    };

    ns.textarea = {
        SSH_KEY_HINT: t.s('HINT: Drag and drop an SSH private key file on the field below.')
    };

    ns.lookup = {
        NOT_FOUND: t.s('That value was not found. Please enter or select a valid value.')
    };

    ns.truncate = {
        DEFAULT: t.s('Copy full revision to clipboard.'),
        COPIED: t.s('Copied to clipboard.')
    };

    ns.toggle = {
        VIEW_MORE: t.s('VIEW MORE'),
        VIEW_LESS: t.s('VIEW LESS')
    };

    ns.tooltips = {
        VIEW_THE_CREDENTIAL: t.s('View the Credential'),
    };

    ns.layout = {
        CURRENT_USER_LABEL: t.s('Logged in as'),
        VIEW_DOCS: t.s('View Documentation'),
        LOGOUT: t.s('Logout'),
        DASHBOARD: t.s('Dashboard'),
        JOBS: t.s('Jobs'),
        SCHEDULES: t.s('Schedules'),
        PORTAL_MODE: t.s('Portal Mode'),
        PROJECTS: t.s('Projects'),
        CREDENTIALS: t.s('Credentials'),
        CREDENTIAL_TYPES: t.s('Credential Types'),
        INVENTORIES: t.s('Inventories'),
        TEMPLATES: t.s('Templates'),
        ORGANIZATIONS: t.s('Organizations'),
        USERS: t.s('Users'),
        TEAMS: t.s('Teams'),
        INVENTORY_SCRIPTS: t.s('Inventory Scripts'),
        NOTIFICATIONS: t.s('Notifications'),
        MANAGEMENT_JOBS: t.s('Management Jobs'),
        INSTANCES: t.s('Instances'),
        INSTANCE_GROUPS: t.s('INSTANCE GROUPS'),
        APPLICATIONS: t.s('Applications'),
        SETTINGS: t.s('Settings'),
        FOOTER_ABOUT: t.s('About'),
        FOOTER_COPYRIGHT: t.s('Copyright © 2018 Red Hat, Inc.'),
        VIEWS_HEADER: t.s('Views'),
        RESOURCES_HEADER: t.s('Resources'),
        ACCESS_HEADER: t.s('Access'),
        ADMINISTRATION_HEADER: t.s('Administration')
    };

    ns.relaunch = {
        DEFAULT: t.s('Relaunch using the same parameters'),
        HOSTS: t.s('Relaunch using host parameters'),
        DROPDOWN_TITLE: t.s('Relaunch On'),
        ALL: t.s('All'),
        FAILED: t.s('Failed')
    };

    ns.launchTemplate = {
        DEFAULT: t.s('Start a job using this template')
    };

    ns.list = {
        DEFAULT_EMPTY_LIST: t.s('Please add items to this list.')
    };
}

ComponentsStrings.$inject = ['BaseStringService'];

export default ComponentsStrings;
