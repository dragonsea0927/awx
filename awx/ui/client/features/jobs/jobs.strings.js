function JobsStrings (BaseString) {
    BaseString.call(this, 'jobs');

    const { t } = this;
    const ns = this.jobs;

    ns.list = {
        ROW_ITEM_LABEL_STARTED: t.s('Started'),
        ROW_ITEM_LABEL_FINISHED: t.s('Finished'),
        ROW_ITEM_LABEL_LAUNCHED_BY: t.s('Launched By'),
        ROW_ITEM_LABEL_JOB_TEMPLATE: t.s('Job Template'),
        ROW_ITEM_LABEL_INVENTORY: t.s('Inventory'),
        ROW_ITEM_LABEL_PROJECT: t.s('Project'),
        ROW_ITEM_LABEL_CREDENTIALS: t.s('Credentials'),
    };
}

JobsStrings.$inject = ['BaseStringService'];

export default JobsStrings;
