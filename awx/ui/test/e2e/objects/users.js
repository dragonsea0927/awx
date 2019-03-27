import actions from './sections/actions';
import breadcrumb from './sections/breadcrumb';
import createFormSection from './sections/createFormSection';
import createTableSection from './sections/createTableSection';
import header from './sections/header';
import lookupModal from './sections/lookupModal';
import navigation from './sections/navigation';
import pagination from './sections/pagination';
import permissions from './sections/permissions';
import search from './sections/search';

const row = '#users_table .List-tableRow';

const details = createFormSection({
    selector: 'form',
    props: {
        formElementSelectors: [
            '#user_form .Form-textInput',
            '#user_form select.Form-dropDown'
        ]
    }
});

const addEditElements = {
    title: 'div[class^="Form-title"]',
    confirmPassword: '#user_password_confirm_input',
    email: '#user_email',
    firstName: '#user_first_name',
    lastName: '#user_last_name',
    organization: 'input[name="organization_name"]',
    password: '#user_password_input',
    save: '#user_save_btn',
    username: '#user_username',
    type: '#select2-user_user_type-container',
};

module.exports = {
    url () {
        return `${this.api.globals.launch_url}/#/users`;
    },
    commands: [{
        load () {
            this.api.url('data:,'); // https://github.com/nightwatchjs/nightwatch/issues/1724
            return this.navigate();
        },
        create (user, organization) {
            this.section.list
                .waitForElementVisible('@add')
                .click('@add');
            this.section.add
                .waitForElementVisible('@title')
                .setValue('@organization', organization.name)
                .setValue('@email', user.email)
                .setValue('@username', user.username)
                .setValue('@password', user.password)
                .setValue('@confirmPassword', user.password);
            if (user.firstName) {
                this.section.add.setValue('@firstName', user.firstName);
            }
            if (user.lastName) {
                this.section.add.setValue('@lastName', user.lastName);
            }
            if (user.type) {
                this.section.add
                    .click('@type')
                    .click(`li[id$=${user.type}]`);
            }
            this.section.add.click('@save');
            this.waitForSpinny();
        },
        delete (username) {
            this.search(username);
            const deleteButton = `${row} i[class*="fa-trash-o"]`;
            const modalAction = '.modal-dialog #prompt_action_btn';
            this
                .waitForElementVisible(deleteButton)
                .click(deleteButton)
                .waitForElementVisible(modalAction)
                .click(modalAction)
                .waitForSpinny();
            const searchResults = '.List-searchNoResults';
            this
                .waitForElementVisible(searchResults)
                .expect.element(searchResults).text.contain('No records matched your search.');
        },
        search (username) {
            this.section.list.section.search
                .setValue('@input', username)
                .click('@searchButton');
            this.waitForSpinny();
            this.waitForElementNotPresent(`${row}:nth-of-type(2)`);
            this.expect.element('.List-titleBadge').text.to.contain('1');
            this.expect.element(row).text.contain(username);
        },
    }],
    sections: {
        header,
        navigation,
        breadcrumb,
        lookupModal,
        add: {
            selector: 'div[ui-view="form"]',
            sections: {
                details
            },
            elements: addEditElements,
        },
        edit: {
            selector: 'div[ui-view="form"]',
            sections: {
                details,
                permissions
            },
            elements: addEditElements,
        },
        list: {
            selector: 'div[ui-view="list"]',
            elements: {
                badge: 'span[class~="badge"]',
                title: 'div[class="List-titleText"]',
                add: '#button-add'
            },
            sections: {
                search,
                pagination,
                table: createTableSection({
                    elements: {
                        username: 'td[class~="username-column"]',
                        first_name: 'td[class~="first_name-column"]',
                        last_name: 'td[class~="last_name-column"]'
                    },
                    sections: {
                        actions
                    }
                })
            }
        }
    },
    elements: {
        cancel: 'button[class*="Form-cancelButton"]',
        save: 'button[class*="Form-saveButton"]'
    }
};
