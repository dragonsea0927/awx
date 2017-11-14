import templateUrl from './relaunchButton.partial.html';

const atRelaunch = {
    templateUrl,
    bindings: {
        state: '<'
    },
    controller: ['RelaunchJob', 'InitiatePlaybookRun', 'ComponentsStrings', '$scope', atRelaunchCtrl],
    controllerAs: 'vm'
};

function atRelaunchCtrl (RelaunchJob, InitiatePlaybookRun, strings, $scope) {
    const vm = this;
    const scope = $scope.$parent;
    const job = _.get(scope, 'job') || _.get(scope, 'completed_job');

    vm.$onInit = () => {
        vm.showRelaunch = !(job.type === 'system_job') && job.summary_fields.user_capabilities.start;
        vm.showDropdown = job.type === 'job' && job.failed === true;

        vm.createDropdown();
        vm.createTooltips();
    };

    vm.createDropdown = () => {
        vm.icon = 'icon-launch';
        vm.dropdownTitle = strings.get('relaunch.DROPDOWN_TITLE');
        vm.dropdownOptions = [
            {
                name: strings.get('relaunch.ALL'),
                icon: 'icon-host-all'
            },
            {
                name: strings.get('relaunch.FAILED'),
                icon: 'icon-host-failed'
            }
        ];
    };

    vm.createTooltips = () => {
        if (vm.showDropdown) {
            vm.tooltip = strings.get('relaunch.HOSTS');
        } else {
            vm.tooltip = strings.get('relaunch.DEFAULT');
        }
    };

    vm.relaunchJob = () => {
        let typeId;

        if (job.type === 'inventory_update') {
            typeId = job.inventory_source;
        } else if (job.type === 'project_update') {
            typeId = job.project;
        } else if (job.type === 'job' || job.type === 'system_job'
         || job.type === 'ad_hoc_command' || job.type === 'workflow_job') {
            typeId = job.id;
        }

        RelaunchJob({ scope, id: typeId, type: job.type, name: job.name });
    };

    vm.relaunchOn = (option) => {
        InitiatePlaybookRun({
            scope,
            id: job.id,
            relaunch: true,
            job_type: job.type,
            host_type: (option.name).toLowerCase()
        });
    };
}

export default atRelaunch;
