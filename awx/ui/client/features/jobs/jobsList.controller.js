/** ***********************************************
 * Copyright (c) 2018 Ansible, Inc.
 *
 * All Rights Reserved
 ************************************************ */
const mapChoices = choices => Object
    .assign(...choices.map(([k, v]) => ({ [k]: v })));

function ListJobsController (
    $scope,
    $state,
    Dataset,
    resolvedModels,
    strings,
    qs,
    Prompt,
    $filter,
    ProcessErrors,
    Wait,
    Rest
) {
    const vm = this || {};
    const [unifiedJob] = resolvedModels;

    vm.strings = strings;

    // smart-search
    const name = 'jobs';
    const iterator = 'job';
    const key = 'job_dataset';

    $scope.list = { iterator, name };
    $scope.collection = { iterator, basePath: 'unified_jobs' };
    $scope[key] = Dataset.data;
    $scope[name] = Dataset.data.results;
    $scope.$on('updateDataset', (e, dataset) => {
        $scope[key] = dataset;
        $scope[name] = dataset.results;
    });
    $scope.$on('ws-jobs', () => {
        qs.search(unifiedJob.path, $state.params.job_search)
            .then(({ data }) => {
                $scope.$emit('updateDataset', data);
            });
    });

    vm.jobTypes = mapChoices(unifiedJob
        .options('actions.GET.type.choices'));

    vm.getLink = ({ type, id }) => {
        let link;

        switch (type) {
            case 'job':
                link = `/#/jobs/${id}`;
                break;
            case 'ad_hoc_command':
                link = `/#/ad_hoc_commands/${id}`;
                break;
            case 'system_job':
                link = `/#/management_jobs/${id}`;
                break;
            case 'project_update':
                link = `/#/scm_update/${id}`;
                break;
            case 'inventory_update':
                link = `/#/inventory_sync/${id}`;
                break;
            case 'workflow_job':
                link = `/#/workflows/${id}`;
                break;
            default:
                link = '';
                break;
        }

        return link;
    };

    vm.deleteJob = (job) => {
        const action = () => {
            $('#prompt-modal').modal('hide');
            Wait('start');
            Rest.setUrl(job.url);
            Rest.destroy()
                .then(() => {
                    let reloadListStateParams = null;

                    if ($scope.jobs.length === 1 && $state.params.job_search &&
                    !_.isEmpty($state.params.job_search.page) &&
                    $state.params.job_search.page !== '1') {
                        const page = `${(parseInt(reloadListStateParams
                            .job_search.page, 10) - 1)}`;
                        reloadListStateParams = _.cloneDeep($state.params);
                        reloadListStateParams.job_search.page = page;
                    }

                    $state.go('.', reloadListStateParams, { reload: true });
                })
                .catch(({ data, status }) => {
                    ProcessErrors($scope, data, status, null, {
                        hdr: strings.get('error.HEADER'),
                        msg: strings.get('error.CALL', { path: `${job.url}`, status })
                    });
                })
                .finally(() => {
                    Wait('stop');
                });
        };

        const deleteModalBody = `<div class="Prompt-bodyQuery">${strings.get('deleteResource.CONFIRM', 'job')}</div>`;

        Prompt({
            hdr: strings.get('deleteResource.HEADER'),
            resourceName: $filter('sanitize')(job.name),
            body: deleteModalBody,
            action,
            actionText: 'DELETE'
        });
    };
}

ListJobsController.$inject = [
    '$scope',
    '$state',
    'Dataset',
    'resolvedModels',
    'JobsStrings',
    'QuerySet',
    'Prompt',
    '$filter',
    'ProcessErrors',
    'Wait',
    'Rest'
];

export default ListJobsController;
