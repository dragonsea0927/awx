/*************************************************
 * Copyright (c) 2018 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

export default ['i18n', function(i18n) {
    return {
        // editTitle: 'Authorization Configuration',
        name: 'configuration_ldap3_template',
        showActions: true,
        showHeader: false,

        fields: {
            AUTH_LDAP_3_SERVER_URI: {
                type: 'text',
                reset: 'AUTH_LDAP_3_SERVER_URI'
            },
            AUTH_LDAP_3_BIND_DN: {
                type: 'text',
                reset: 'AUTH_LDAP_3_BIND_DN'
            },
            AUTH_LDAP_3_BIND_PASSWORD: {
                type: 'sensitive',
                hasShowInputButton: true,
            },
            AUTH_LDAP_3_USER_SEARCH: {
                type: 'textarea',
                rows: 6,
                codeMirror: true,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
                reset: 'AUTH_LDAP_3_USER_SEARCH'
            },
            AUTH_LDAP_3_GROUP_SEARCH: {
                type: 'textarea',
                rows: 6,
                codeMirror: true,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
                reset: 'AUTH_LDAP_3_GROUP_SEARCH'
            },
            AUTH_LDAP_3_USER_DN_TEMPLATE: {
                type: 'text',
                reset: 'AUTH_LDAP_3_USER_DN_TEMPLATE'
            },
            AUTH_LDAP_3_USER_ATTR_MAP: {
                type: 'textarea',
                reset: 'AUTH_LDAP_3_USER_ATTR_MAP',
                rows: 6,
                codeMirror: true,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
            },
            AUTH_LDAP_3_GROUP_TYPE: {
                type: 'select',
                reset: 'AUTH_LDAP_3_GROUP_TYPE',
                ngOptions: 'group.label for group in AUTH_LDAP_3_GROUP_TYPE_options track by group.value',
            },
            AUTH_LDAP_3_REQUIRE_GROUP: {
                type: 'text',
                reset: 'AUTH_LDAP_3_REQUIRE_GROUP'
            },
            AUTH_LDAP_3_DENY_GROUP: {
                type: 'text',
                reset: 'AUTH_LDAP_3_DENY_GROUP'
            },
            AUTH_LDAP_3_START_TLS: {
                type: 'toggleSwitch'
            },
            AUTH_LDAP_3_USER_FLAGS_BY_GROUP: {
                type: 'textarea',
                reset: 'AUTH_LDAP_3_USER_FLAGS_BY_GROUP',
                codeMirror: true,
                rows: 6,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
            },
            AUTH_LDAP_3_ORGANIZATION_MAP: {
                type: 'textarea',
                reset: 'AUTH_LDAP_3_ORGANIZATION_MAP',
                codeMirror: true,
                rows: 6,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
            },
            AUTH_LDAP_3_TEAM_MAP: {
                type: 'textarea',
                reset: 'AUTH_LDAP_3_TEAM_MAP',
                codeMirror: true,
                rows: 6,
                class: 'Form-textAreaLabel Form-formGroup--fullWidth',
            }
        },

        buttons: {
            reset: {
                ngShow: '!user_is_system_auditor',
                ngClick: 'vm.resetAllConfirm()',
                label: i18n._('Revert all to default'),
                class: 'Form-resetAll'
            },
            cancel: {
                ngClick: 'vm.formCancel()',
            },
            save: {
                ngClick: 'vm.formSave()',
                ngDisabled: "!ldap_auth || configuration_ldap3_template_form.$invalid || configuration_ldap3_template_form.$pending"
            }
        }
    };
}
];
