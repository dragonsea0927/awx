/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

 /**
 * @ngdoc function
 * @name forms.function:CustomInventory
 * @description This form is for adding/editing an organization
*/

export default ['i18n', function(i18n) {
    return {

        addTitle: i18n._('NEW NOTIFICATION TEMPLATE'),
        editTitle: '{{ name }}',
        name: 'notification_template',
        // I18N for "CREATE NOTIFICATION_TEMPLATE"
        // on /#/notification_templates/add
        breadcrumbName: i18n._('NOTIFICATION TEMPLATE'),
        stateTree: 'notifications',
        basePath: 'notification_templates',
        showActions: true,
        subFormTitles: {
            typeSubForm: i18n._('Type Details'),
        },


        fields: {
            name: {
                label: i18n._('Name'),
                type: 'text',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)',
                required: true,
                capitalize: false
            },
            description: {
                label: i18n._('Description'),
                type: 'text',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            organization: {
                label: i18n._('Organization'),
                type: 'lookup',
                list: 'OrganizationList',
                basePath: 'organizations',
                sourceModel: 'organization',
                sourceField: 'name',
                awRequiredWhen: {
                    reqExpression: "organizationrequired",
                    init: "true"
                },
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            notification_type: {
                label:  i18n._('Type'),
                type: 'select',
                required: true,
                class: 'NotificationsForm-typeSelect',
                ngOptions: 'type.label for type in notification_type_options track by type.value',
                ngChange: 'typeChange()',
                hasSubForm: true,
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            username: {
                label: i18n._('Username'),
                type: 'text',
                ngShow: "notification_type.value == 'email' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            password: {
                labelBind: 'passwordLabel',
                type: 'sensitive',
                hasShowInputButton: true,
                awRequiredWhen: {
                    reqExpression: "password_required" ,
                    init: "false"
                },
                ngShow: "notification_type.value == 'email' || notification_type.value == 'irc' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            host: {
                label: i18n._('Host'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "email_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'email' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            recipients: {
                label: i18n._('Recipient List'),
                type: 'textarea',
                rows: 3,
                awPopOver: '<p>' + i18n._('Type an option on each line.') + '</p>'+
                            '<p>' + i18n._('For example:') + '<br>alias1@email.com<br>\n alias2@email.com<br>\n',
                dataTitle: i18n._('Recipient List'),
                dataPlacement: 'right',
                dataContainer: "body",
                awRequiredWhen: {
                    reqExpression: "email_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'email' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            sender: {
                label: i18n._('Sender Email'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "email_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'email' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            port: {
                labelBind: 'portLabel',
                type: 'number',
                integer: true,
                spinner: true,
                'class': "input-small",
                min: 0,
                awRequiredWhen: {
                    reqExpression: "port_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'email' || notification_type.value == 'irc'",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            channels: {
                label: i18n._('Destination Channels'),
                type: 'textarea',
                rows: 3,
                awPopOver: '<p>' + i18n._('Type an option on each line. The pound symbol (#) is not required.') + '</p>'+
                            '<p>' + i18n._('For example:') + '<br>engineering<br>\n #support<br>\n',
                dataTitle: i18n._('Destination Channels'),
                dataPlacement: 'right',
                dataContainer: "body",
                awRequiredWhen: {
                    reqExpression: "channel_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'slack'",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            rooms: {
                label: i18n._('Destination Channels'),
                type: 'textarea',
                rows: 3,
                awPopOver: '<p>' + i18n._('Type an option on each line. The pound symbol (#) is not required.') + '</p>'+
                            '<p>' + i18n._('For example:') + '<br>engineering<br>\n #support<br>\n',
                dataTitle: i18n._('Destination Channels'),
                dataPlacement: 'right',
                dataContainer: "body",
                awRequiredWhen: {
                    reqExpression: "room_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'hipchat'",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            token: {
                labelBind: 'tokenLabel',
                type: 'sensitive',
                hasShowInputButton: true,
                awRequiredWhen: {
                    reqExpression: "token_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'slack' || notification_type.value == 'pagerduty' || notification_type.value == 'hipchat'",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            account_token: {
                label: i18n._('Account Token'),
                type: 'sensitive',
                hasShowInputButton: true,
                awRequiredWhen: {
                    reqExpression: "twilio_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'twilio' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            from_number: {
                label: i18n._('Source Phone Number'),
                dataTitle: i18n._('Source Phone Number'),
                type: 'text',
                awPopOver: '<p>' + i18n._('Number associated with the "Messaging Service" in Twilio.') + '</p>'+
                            '<p>' + i18n.sprintf(i18n._('This must be of the form %s.'), '<code>+18005550199</code>') + '</p>',
                awRequiredWhen: {
                    reqExpression: "twilio_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'twilio' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            to_numbers: {
                label: i18n._('Destination SMS Number'),
                dataTitle: i18n._('Destination SMS Number'),
                type: 'textarea',
                rows: 3,
                awPopOver: '<p>' + i18n._('Type an option on each line.') + '</p>'+
                            '<p>' + i18n._('For example:') + '<br><code>+12125552368</code><br>\n<code>+19105556162</code><br>\n',
                dataPlacement: 'right',
                dataContainer: "body",
                awRequiredWhen: {
                    reqExpression: "twilio_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'twilio' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            account_sid: {
                label: i18n._('Account SID'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "twilio_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'twilio' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            subdomain: {
                label: i18n._('Pagerduty subdomain'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "pagerduty_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'pagerduty' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            service_key: {
                label: i18n._('API Service/Integration Key'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "pagerduty_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'pagerduty' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            client_name: {
                label: i18n._('Client Identifier'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "pagerduty_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'pagerduty' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            api_url: {
                label: 'API URL',
                type: 'text',
                placeholder: 'https://mycompany.hipchat.com',
                awRequiredWhen: {
                    reqExpression: "hipchat_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'hipchat' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            message_from: {
                label: i18n._('Notification Label'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "hipchat_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'hipchat' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            color: {
                label: i18n._('Notification Color'),
                dataTitle: i18n._('Notification Color'),
                type: 'select',
                ngOptions: 'color for color in hipchatColors track by color',
                awPopOver: '<p>' + i18n.sprintf(i18n._('Color can be one of %s.'), '<code>yellow</code>, <code>green</code>, <code>red</code>, ' +
                           '<code>purple</code>, <code>gray</code>, <code>random</code>') + '\n',
                awRequiredWhen: {
                    reqExpression: "hipchat_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'hipchat' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            notify: {
                label: i18n._('Notify Channel'),
                type: 'checkbox',
                ngShow: "notification_type.value == 'hipchat' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            url: {
                label: i18n._('Target URL'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "webhook_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'webhook' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            headers: {
                label: i18n._('HTTP Headers'),
                dataTitle: i18n._('HTTP Headers'),
                type: 'textarea',
                name: 'headers',
                rows: 5,
                'class': 'Form-formGroup--fullWidth',
                awRequiredWhen: {
                    reqExpression: "webhook_required",
                    init: "false"
                },
                awPopOver: '<p>' + i18n._('Specify HTTP Headers in JSON format') + '</p>' +
                           '<p>' + i18n._('For example:') + '<br><pre>\n' +
                           '{\n' +
                           '  "X-Auth-Token": "828jf0",\n' +
                           '  "X-Ansible": "Is great!"\n' +
                           '}\n' +
                           '</pre></p>',
                dataPlacement: 'right',
                ngShow: "notification_type.value == 'webhook' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            server: {
                label: i18n._('IRC Server Address'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "irc_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'irc' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            nickname: {
                label: i18n._('IRC Nick'),
                type: 'text',
                awRequiredWhen: {
                    reqExpression: "irc_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'irc' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            targets: {
                label: i18n._('Destination Channels or Users'),
                type: 'textarea',
                rows: 3,
                awPopOver: '<p>' + i18n._('Type an option on each line. The pound symbol (#) is not required.') + '</p>'+
                            '<p>' + i18n._('For example:') + '<br>' + i18n.sprintf(i18n._('%s or %s'), '#support', 'support') + '<br>\n ' + i18n.sprintf(i18n._('%s or %s'), '@username', 'username') + '<br>\n',
                dataTitle: i18n._('Destination Channels'),
                dataPlacement: 'right',
                dataContainer: "body",
                awRequiredWhen: {
                    reqExpression: "irc_required",
                    init: "false"
                },
                ngShow: "notification_type.value == 'irc' ",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            use_ssl: {
                label: i18n._('SSL Connection'),
                type: 'checkbox',
                ngShow: "notification_type.value == 'irc'",
                subForm: 'typeSubForm',
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            email_options: {
                label: i18n._('Options'),
                type: 'radio_group',
                subForm: 'typeSubForm',
                ngShow: "notification_type.value == 'email'",
                ngClick: "emailOptionsChange()",
                ngDisabled: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)',
                options: [{
                    value: 'use_tls',
                    label: i18n._('Use TLS'),
                    ngShow: "notification_type.value == 'email' ",
                    labelClass: 'NotificationsForm-radioButtons'
                }, {
                    value: 'use_ssl',
                    label: i18n._('Use SSL'),
                    ngShow: "notification_type.value == 'email'",
                    labelClass: 'NotificationsForm-radioButtons'
                }]
            }
        },

        buttons: { //for now always generates <button> tags
            cancel: {
                ngClick: 'formCancel()',
                ngShow: '(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            close: {
                ngClick: 'formCancel()',
                ngShow: '!(notification_template.summary_fields.user_capabilities.edit || canAdd)'
            },
            save: {
                ngClick: 'formSave()',
                ngShow: '(notification_template.summary_fields.user_capabilities.edit || canAdd)', //$scope.function to call on click, optional
                ngDisabled: true //Disable when $pristine or $invalid, optional
            }
        }
    };
}];
