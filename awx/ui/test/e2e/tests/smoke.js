import uuid from 'uuid';

const id = uuid().substr(0, 8);

const INVENTORY_NAME = `inventory-${id}`;
const MACHINE_CREDENTIAL_NAME = `credential-machine-${id}`;
const ORGANIZATION_NAME = `organization-${id}`;
const PROJECT_NAME = `project-${id}`;
const PROJECT_URL = 'https://github.com/ansible/awx';
const PROJECT_BRANCH = 'devel';
const PLAYBOOK_NAME = 'awx/ui/test/e2e/tests/smoke.yml';
const TEMPLATE_NAME = `template-${id}`;
const VAULT_CREDENTIAL_NAME = `credential-vault-${id}`;
const VAULT_CREDENTIAL_PASSWORD = 'VAULT_CREDENTIAL_PASSWORD';

module.exports = {
    'login to awx': client => {
        client.login();
        client.resizeWindow(1200, 800);
        client.waitForAngular();
    },
    'create organization': client => {
        const organizations = client.page.organizations();
        const { details } = organizations.section.add.section;

        organizations.section.navigation.waitForElementVisible('@organizations');
        organizations.section.navigation.expect.element('@organizations').enabled;
        organizations.section.navigation.click('@organizations');

        organizations.waitForElementVisible('div.spinny');
        organizations.waitForElementNotVisible('div.spinny');

        organizations.section.list.expect.element('@add').visible;
        organizations.section.list.expect.element('@add').enabled;
        organizations.section.list.click('@add');

        details.waitForElementVisible('@name');
        details.expect.element('@name').enabled;

        details.setValue('@name', ORGANIZATION_NAME);

        organizations.waitForElementVisible('@save');
        organizations.expect.element('@save').enabled;
        organizations.click('@save');

        organizations.waitForElementVisible('div.spinny');
        organizations.waitForElementNotVisible('div.spinny');
    },
    'create project': client => {
        const projects = client.page.projects();

        projects.navigate();
        projects.waitForElementVisible('div.spinny');
        projects.waitForElementNotVisible('div.spinny');

        projects.section.list.waitForElementVisible('@add');
        projects.section.list.expect.element('@add').enabled;
        projects.section.list.click('@add');

        projects.waitForElementVisible('label[for="name"] + div input');
        projects.waitForElementVisible('label[for="organization"] + div input');
        projects.waitForElementPresent('label[for="scm_type"] + div > div select option[value="git"]');

        projects.setValue('label[for="name"] + div input', PROJECT_NAME);
        projects.clearValue('label[for="organization"] + div input');
        projects.setValue('label[for="organization"] + div input', ORGANIZATION_NAME);
        projects.click('label[for="scm_type"] + div > div select option[value="git"]');

        projects.waitForElementVisible('.sourceSubForm');
        projects.waitForElementVisible('label[for="scm_url"] + div input');
        projects.waitForElementVisible('label[for="scm_branch"] + div input');

        projects.setValue('label[for="scm_url"] + div input', PROJECT_URL);
        projects.setValue('label[for="scm_branch"] + div input', PROJECT_BRANCH);

        projects.expect.element('#project_save_btn').enabled;
        projects.click('#project_save_btn');

        projects.waitForElementVisible('div.spinny');
        projects.waitForElementNotVisible('div.spinny');

        projects.expect.element('smart-search input').enabled;
        projects.sendKeys('smart-search input', `${PROJECT_NAME}${client.Keys.ENTER}`);

        projects.waitForElementVisible('div.spinny');
        projects.waitForElementNotVisible('div.spinny');

        projects.waitForElementVisible('div.spinny', 120000);
        projects.waitForElementNotVisible('div.spinny');
        projects.expect.element('i[class$="success"]').visible;
    },
    'create inventory': client => {
        const inventories = client.page.inventories();
        const details = inventories.section.addStandardInventory.section.standardInvDetails;

        inventories.section.navigation.waitForElementVisible('@inventories');
        inventories.section.navigation.expect.element('@inventories').enabled;
        inventories.section.navigation.click('@inventories');

        inventories.waitForElementVisible('div.spinny');
        inventories.waitForElementNotVisible('div.spinny');

        inventories.selectAdd('Inventory');

        details.waitForElementVisible('@name');
        details.waitForElementVisible('@organization');

        details.expect.element('@name').enabled;
        details.expect.element('@organization').enabled;

        details.setValue('@name', INVENTORY_NAME);
        details.setValue('@organization', ORGANIZATION_NAME);

        inventories.waitForElementVisible('@save');
        inventories.expect.element('@save').enabled;

        inventories.click('@save');

        inventories.waitForElementVisible('div.spinny');
        inventories.waitForElementNotVisible('div.spinny');
    },
    'create host': client => {
        const addHost = './/span[text()="+ ADD HOST"]';

        client.expect.element('#hosts_tab').enabled;
        client.expect.element('#hosts_tab').css('opacity').equal('1');
        client.expect.element('#hosts_tab').css('background-color').contain('255, 255, 255');
        client.click('#hosts_tab');

        client.waitForElementVisible('div.spinny');
        client.waitForElementNotVisible('div.spinny');

        client.expect.element('#hosts_tab').css('background-color').contain('132, 137, 146');

        client.useXpath();
        client.waitForElementVisible(addHost);
        client.expect.element(addHost).enabled;
        client.click(addHost);
        client.useCss();

        client.waitForElementVisible('#host_name');
        client.sendKeys('#host_name', 'localhost');

        client.click('div[class="CodeMirror-scroll"]');
        client.sendKeys('.CodeMirror textarea', client.Keys.ENTER);
        client.sendKeys('.CodeMirror textarea', 'ansible_connection: local');
        client.click('#host_host_variables_parse_type label[class$="hollow"]');
        client.click('#host_host_variables_parse_type label[class$="hollow"]');

        client.expect.element('#host_save_btn').enabled;
        client.click('#host_save_btn');

        client.waitForElementVisible('div.spinny');
        client.waitForElementNotVisible('div.spinny');
    },
    'create vault credential': client => {
        const credentials = client.page.credentials();
        const { details } = credentials.section.add.section;

        credentials.section.navigation.waitForElementVisible('@credentials');
        credentials.section.navigation.expect.element('@credentials').enabled;
        credentials.section.navigation.click('@credentials');

        credentials.waitForElementVisible('div.spinny');
        credentials.waitForElementNotVisible('div.spinny');

        credentials.section.list.waitForElementVisible('@add');
        credentials.section.list.expect.element('@add').enabled;
        credentials.section.list.click('@add');

        details.waitForElementVisible('@save');
        details.clearAndSelectType('Vault');
        details.setValue('@organization', ORGANIZATION_NAME);
        details.setValue('@name', VAULT_CREDENTIAL_NAME);

        details.section.vault.setValue('@vaultPassword', VAULT_CREDENTIAL_PASSWORD);

        details.expect.element('@save').enabled;
        details.click('@save');

        credentials.waitForElementVisible('div.spinny');
        credentials.waitForElementNotVisible('div.spinny');
    },
    'create machine credential': client => {
        const credentials = client.page.credentials();
        const { details } = credentials.section.add.section;

        credentials.section.navigation.waitForElementVisible('@credentials');
        credentials.section.navigation.expect.element('@credentials').enabled;
        credentials.section.navigation.click('@credentials');

        credentials.waitForElementVisible('div.spinny');
        credentials.waitForElementNotVisible('div.spinny');

        credentials.section.list.waitForElementVisible('@add');
        credentials.section.list.expect.element('@add').enabled;
        credentials.section.list.click('@add');

        details.waitForElementVisible('@save');
        details.clearAndSelectType('Machine');
        details.setValue('@organization', ORGANIZATION_NAME);
        details.setValue('@name', MACHINE_CREDENTIAL_NAME);

        details.expect.element('@save').enabled;
        details.click('@save');

        credentials.waitForElementVisible('div.spinny');
        credentials.waitForElementNotVisible('div.spinny');
    },
    'create job template': client => {
        const templates = client.page.templates();

        templates.navigate();
        templates.waitForElementVisible('div.spinny');
        templates.waitForElementNotVisible('div.spinny');

        templates.selectAdd('Job Template');
        templates.selectInventory(INVENTORY_NAME);
        templates.selectProject(PROJECT_NAME);
        templates.selectVaultCredential(VAULT_CREDENTIAL_NAME);
        templates.selectMachineCredential(MACHINE_CREDENTIAL_NAME);
        templates.selectPlaybook(PLAYBOOK_NAME);
        templates.sendKeys('label[for="name"] + div input', TEMPLATE_NAME);

        templates.expect.element('#job_template_save_btn').enabled;
        templates.click('#job_template_save_btn');

        templates.waitForElementVisible('div.spinny');
        templates.waitForElementNotVisible('div.spinny');

        templates.expect.element('#job_template_save_btn').enabled;
    },
    'launch job': client => {
        const templates = client.page.templates();

        templates.waitForElementVisible('smart-search input');
        templates.expect.element('smart-search input').enabled;

        templates.sendKeys('smart-search input', `${TEMPLATE_NAME}${client.Keys.ENTER}`);
        templates.waitForElementVisible('div.spinny');
        templates.waitForElementNotVisible('div.spinny');

        templates.sendKeys('smart-search input', `${TEMPLATE_NAME}${client.Keys.ENTER}`);
        templates.waitForElementVisible('div.spinny');
        templates.waitForElementNotVisible('div.spinny');

        templates.waitForElementPresent('i[class$="launch"]');
        templates.waitForElementNotPresent('i[class$="launch"]:nth-of-type(2)');

        templates.expect.element('.List-titleBadge').text.equal('1');

        templates.waitForElementVisible('i[class$="launch"]');
        templates.click('i[class$="launch"]');
    },
    'verify expected job results': client => {
        const output = './/span[normalize-space(text())=\'"msg": "Hello World!"\']';
        const running = 'i[class$="icon-job-running"]';
        const success = 'i[class$="icon-job-successful"]';

        client.waitForElementVisible('div.spinny');
        client.waitForElementNotVisible('div.spinny');

        client.waitForElementVisible('.JobResults-detailsPanel');
        client.waitForElementNotPresent(running, 60000);
        client.waitForElementVisible(success, 60000);

        client.useXpath();
        client.waitForElementVisible(output, 60000);
        client.useCss();

        client.end();
    }
};
