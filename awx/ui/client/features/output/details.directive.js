const templateUrl = require('~features/output/details.partial.html');

let $http;
let $filter;
let $state;

let error;
let parse;
let prompt;
let resource;
let strings;
let wait;

function mapChoices (choices) {
    return Object.assign(...choices.map(([k, v]) => ({[k]: v})));
}

function getStatusDetails (status) {
    const value = status || resource.model.get('status');
    const label = 'Status';
    const choices = mapChoices(resource.model.options('actions.GET.status.choices'));

    const displayValue = choices[value];

    return { displayValue, label, value };
}

function getStartTimeDetails (started) {
    const value = started || resource.model.get('started');
    const label = 'Started';

    let displayValue;

    if (value) {
        displayValue = $filter('longDate')(value);
    } else {
        displayValue = 'Not Started';
    }

    return { displayValue, label, value };
}

function getFinishTimeDetails (finished) {
    const value = finished || resource.model.get('finished');
    const label = 'Finished';

    let displayValue;

    if (value) {
        displayValue = $filter('longDate')(value);
    } else {
        displayValue = 'Not Finished';
    }

    return { displayValue, label, value };
}

function getJobTypeDetails () {
    const value = resource.model.get('job_type');
    const label = 'Job Type';
    const choices = mapChoices(resource.model.options('actions.GET.job_type.choices'));

    const displayValue = choices[value];

    return { displayValue, label, value };
}


function getVerbosityDetails () {
    const value = resource.model.get('verbosity');
    const choices = mapChoices(resource.model.options('actions.GET.verbosity.choices'));

    const displayValue = choices[value];
    const label = 'Verbosity';

    return { displayValue, label, value };
}

function getSourceWorkflowJobDetails () {
    const sourceWorkflowJob = resource.model.get('summary_fields.source_workflow_job');

    if (!sourceWorkflowJob) {
        return null;
    }

    const link = `/#/workflows/${sourceWorkflowJob.id}`;

    return { link };
}

function getJobTemplateDetails () {
    const jobTemplate = resource.model.get('summary_fields.job_template');

    if (!jobTemplate) {
        return null;
    }

    const label = 'Job Template';
    const link = `/#/templates/job_template/${jobTemplate.id}`;
    const value = $filter('sanitize')(jobTemplate.name);

    return { label, link, value };
}

function getLaunchedByDetails () {
    const createdBy = resource.model.get('summary_fields.created_by');
    const jobTemplate = resource.model.get('summary_fields.job_template');

    const relatedSchedule = resource.model.get('related.schedule');
    const schedule = resource.model.get('summary_fields.schedule');

    if (!createdBy && !schedule) {
        return null;
    }

    const label = 'Launched By';

    let link;
    let tooltip;
    let value;

    if (createdBy) {
        tooltip = 'Edit the User';
        link = `/#/users/${createdBy.id}`;
        value = $filter('sanitize')(createdBy.username);
    } else if (relatedSchedule && jobTemplate) {
        tooltip = 'Edit the Schedule';
        link = `/#/templates/job_template/${jobTemplate.id}/schedules/${schedule.id}`;
        value = $filter('sanitize')(schedule.name);
    } else {
        tooltip = null;
        link = null;
        value = $filter('sanitize')(schedule.name);
    }

    return { label, link, tooltip, value };
}

function getInventoryDetails () {
    const inventory = resource.model.get('summary_fields.inventory');

    if (!inventory) {
        return null;
    }

    const label = 'Inventory';
    const tooltip = 'Edit the inventory';
    const value = $filter('sanitize')(inventory.name);

    let link;

    if (inventory.kind === 'smart') {
        link = `/#/inventories/smart/${inventory.id}`;
    } else {
        link = `/#/inventories/inventory/${inventory.id}`;
    }

    return { label, link, tooltip, value };
}

function getProjectDetails () {
    const project = resource.model.get('summary_fields.project');
    const projectUpdate = resource.model.get('summary_fields.project_update');

    if (!project) {
        return null;
    }

    const label = 'Project';
    const link = `/#/projects/${project.id}`;
    const value = $filter('sanitize')(project.name);

    if (projectUpdate) {
        const update = {
            link: `/#/jobz/project/${projectUpdate.id}`,
            tooltip: 'View project checkout results',
            status: projectUpdate.status,
        };

        return { label, link, value, update };
    }

    return { label, link, value };
}

function getSCMRevisionDetails () {
    const label = 'Revision';
    const value = resource.model.get('scm_revision');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getPlaybookDetails () {
    const label = 'Playbook';
    const value = resource.model.get('playbook');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getJobExplanationDetails () {
    const jobExplanation = resource.model.get('job_explanation');

    if (!jobExplanation) {
        return null;
    }

    const value = null;

    return { value };
}

function getResultTracebackDetails () {
    const previousTaskFailed = false;
    const resultTraceback = resource.model.get('result_traceback');

    if (!resultTraceback) {
        return null;
    }

    if (!previousTaskFailed) {
        return null;
    }

    const label = 'Results Traceback';
    const value = null;

    return { label, value };
}

function getMachineCredentialDetails () {
    const machineCredential = resource.model.get('summary_fields.credential');

    if (!machineCredential) {
        return null;
    }

    const label = 'Machine Credential';
    const link = `/#/credentials/${machineCredential.id}`;
    const tooltip = 'Edit the Credential';
    const value = $filter('sanitize')(machineCredential.name);

    return { label, link, tooltip, value };
}

function getForkDetails () {
    const label = 'Forks';
    const value = resource.model.get('forks');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getLimitDetails () {
    const label = 'Limit';
    const value = resource.model.get('limit');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getInstanceGroupDetails () {

    const instanceGroup = resource.model.get('summary_fields.instance_group');

    if (!instanceGroup) {
        return null;
    }

    const label = 'Instance Group';
    const value = $filter('sanitize')(instanceGroup.name);

    let isolated = null;

    if (instanceGroup.controller_id) {
        isolated = 'Isolated';
    }

    return { label, value, isolated };
}

function getJobTagDetails () {
    const label = 'Job Tags';
    const value = resource.model.get('job_tags');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getSkipTagDetails () {
    const label = 'Skip Tags';
    const value = resource.model.get('skip_tags');

    if (!value) {
        return null;
    }

    return { label, value };
}

function getExtraVarsDetails () {
    const extraVars = resource.model.get('extra_vars');

    if (!extraVars) {
        return null;
    }

    const label = 'Extra Variables';
    const tooltip = 'Read-only view of extra variables added to the job template.';
    const value = parse(extraVars);

    return { label, tooltip, value };
}

function getLabelDetails () {
    const jobLabels = _.get(resource.model.get('related.labels'), 'results', []);

    if (jobLabels.length < 1) {
        return null;
    }

    const label = 'Labels';
    const value = jobLabels.map(({ name }) => name).map($filter('sanitize'));

    let more = false;

    return { label, more, value };
}

function createErrorHandler (path, action) {
    return ({ data, status }) => {
        const hdr = strings.get('error.HEADER');
        const msg = strings.get('error.CALL', { path, action, status });

        error($scope, data, status, null, { hdr, msg });
    };
}

const ELEMENT_LABELS = '#job-results-labels';
const ELEMENT_PROMPT_MODAL = '#prompt-modal';
const LABELS_SLIDE_DISTANCE = 200;

function toggleLabels () {
    if (!this.labels.more) {
        $(ELEMENT_LABELS).slideUp(LABELS_SLIDE_DISTANCE);
        this.labels.more = true;
    } else {
        $(ELEMENT_LABELS).slideDown(LABELS_SLIDE_DISTANCE);
        this.labels.more = false;
    }
}

function cancelJob () {
    const actionText = strings.get('CANCEL');
    const hdr = strings.get('warnings.CANCEL_HEADER');
    const warning = strings.get('warnings.CANCEL_BODY');

    const id = resource.model.get('id');
    const name = $filter('sanitize')(resource.model.get('name'));

    const body = `<div class="Prompt-bodyQuery">${warning}</div>`;
    const resourceName = `#${id} ${name}`;

    const method = 'POST';
    const url = `${resource.model.path}/${id}/cancel/`;

    const errorHandler = createErrorHandler('cancel job', method);

    const action = () => {
        wait('start');
        $http({ method, url })
            .then(() => $state.go('jobs'))
            .catch(errorHandler)
            .finally(() => {
                $(ELEMENT_PROMPT_MODAL).modal('hide');
                wait('stop');
            });
    };

    prompt({ hdr, resourceName, body, actionText, action });
}

function deleteJob () {
    return;
}

function AtDetailsController (
    _$http_,
    _$filter_,
    _$state_,
    _error_,
    _prompt_,
    _strings_,
    _wait_,
    ParseTypeChange,
    ParseVariableString,
) {
    const vm = this || {};

    $http = _$http_;
    $filter = _$filter_;
    $state = _$state_;

    error = _error_;
    // resource = _resource_;
    parse = ParseVariableString;
    prompt = _prompt_;
    strings = _strings_;
    wait = _wait_;

    // statusChoices = mapChoices(resource.options('status.choices'));

    vm.init = scope => {
        vm.job = scope.job || {};
        resource = scope.resource;

        vm.status = getStatusDetails(scope.status);
        vm.startTime = getStartTimeDetails();
        vm.finishTime = getFinishTimeDetails();
        vm.jobType = getJobTypeDetails();
        vm.jobTemplate = getJobTemplateDetails();
        vm.sourceWorkflowJob = getSourceWorkflowJobDetails();
        vm.inventory = getInventoryDetails();
        vm.project = getProjectDetails();
        vm.scmRevision = getSCMRevisionDetails();
        vm.playbook = getPlaybookDetails();
        vm.resultTraceback = getResultTracebackDetails();
        vm.launchedBy = getLaunchedByDetails();
        vm.jobExplanation = getJobExplanationDetails();
        vm.verbosity = getVerbosityDetails();
        vm.machineCredential = getMachineCredentialDetails();
        vm.forks = getForkDetails();
        vm.limit = getLimitDetails();
        vm.instanceGroup = getInstanceGroupDetails();
        vm.jobTags = getJobTagDetails();
        vm.skipTags = getSkipTagDetails();
        vm.extraVars = getExtraVarsDetails();
        vm.labels = getLabelDetails();

        vm.cancelJob = cancelJob;
        vm.deleteJob = deleteJob;
        vm.toggleLabels = toggleLabels;

        // codemirror
        const cm = { parseType: 'yaml', variables: vm.extraVars.value, $apply: scope.$apply };
        ParseTypeChange({ scope: cm, field_id: 'cm-extra-vars', readOnly: true });

        scope.$watch('status', value => { vm.status = getStatusDetails(value); });
    }
}

AtDetailsController.$inject = [
    '$http',
    '$filter',
    '$state',
    'ProcessErrors',
    'Prompt',
    'JobStrings',
    'Wait',
    'ParseTypeChange',
    'ParseVariableString',
];

function atDetailsLink (scope, el, attrs, controllers) {
    const [atDetailsController] = controllers;

    atDetailsController.init(scope);
}

function atDetails () {
    return {
        templateUrl,
        restrict: 'E',
        require: ['atDetails'],
        controllerAs: 'vm',
        link: atDetailsLink,
        controller: AtDetailsController,
        scope: {
            job: '=',
            status: '=',
            resource: '=',
        },
    };
}

export default atDetails;
