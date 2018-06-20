/* eslint-disable */
function NetworkingController (canEdit, inventory, $state, $scope, strings) {
    const vm = this || {};

    vm.networkUIisOpen = true;
    vm.strings = strings;
    vm.panelTitle = `${strings.get('state.BREADCRUMB_LABEL')} | ${inventory.name}`;
    vm.hostDetail = {};
    vm.canEdit = canEdit;
    vm.rightPanelIsExpanded = false;
    vm.leftPanelIsExpanded = true;
    vm.keyPanelExpanded = false;
    vm.groups = [];
    $scope.devices = [];
    vm.close = () => {
        vm.networkUIisOpen = false;
        $scope.$broadcast('awxNet-closeNetworkUI');
        $state.go('inventories');
    };

    vm.key = () => {
        vm.keyPanelExpanded = !vm.keyPanelExpanded;
    };

    vm.hideToolbox = () => {
        vm.leftPanelIsExpanded = !vm.leftPanelIsExpanded;
        $scope.$broadcast('awxNet-hideToolbox', vm.leftPanelIsExpanded);
    };

    $scope.$on('awxNet-instatiateSelect', (e, devices) => {
        for(var i = 0; i < devices.length; i++){
            let device = devices[i];
            let grouping;
            switch (device.type){
                case 'host':
                    grouping = strings.get('search.HOST');
                    break;
                case 'switch':
                    grouping = strings.get('search.SWITCH');
                    break;
                case 'router':
                    grouping = strings.get('search.ROUTER');
                    break;
                default:
                    grouping = strings.get('search.UNKNOWN');
            }
            $scope.devices.push({
                    value: device.id,
                    text: device.name,
                    label: device.name,
                    id: device.id,
                    type: device.type,
                    group_type: grouping
                });
        }

        $("#networking-search").select2({
            width:'400px',
            containerCssClass: 'Form-dropDown',
            placeholder: strings.get('search.SEARCH'),
            dropdownParent: $('.Networking-toolbar'),
        });

        $("#networking-actionsDropdown").select2({
            width:'400px',
            containerCssClass: 'Form-dropDown',
            minimumResultsForSearch: -1,
            placeholder: strings.get('actions.ACTIONS'),
            dropdownParent: $('.Networking-toolbar'),
        });
    });

    $scope.$on('awxNet-addSearchOption', (e, device) => {
        $scope.devices.push({
                value: device.id,
                text: device.name,
                label: device.name,
                id: device.id,
                type: device.type
            });
    });

    $scope.$on('awxNet-editSearchOption', (e, device) => {
        for(var i = 0; i < $scope.devices.length; i++){
            if(device.id === $scope.devices[i].id){
                $scope.devices[i].text = device.name;
                $scope.devices[i].label = device.name;
            }
        }
    });

    $scope.$on('awxNet-removeSearchOption', (e, device) => {
        for (var i = 0; i < $scope.devices.length; i++) {
            if ($scope.devices[i].id === device.id) {
                $scope.devices.splice(i, 1);
            }
        }
    });

    //Handlers for actions drop down
    $('#networking-actionsDropdown').on('select2:select', (e) => {
        $scope.$broadcast('awxNet-toolbarButtonEvent', e.params.data.title);
        $("#networking-actionsDropdown").val(null).trigger('change');
    });

    $('#networking-actionsDropdown').on('select2:open', () => {
        $('.select2-dropdown').addClass('Networking-dropDown');
    });

    // Handlers for search dropdown
    $('#networking-search').on('select2:select', () => {
        $scope.$broadcast('awxNet-search', $scope.device);
    });

    $('#networking-search').on('select2:open', () => {
        $('.select2-dropdown').addClass('Networking-dropDown');
        $scope.$broadcast('awxNet-SearchDropdown');
    });

    $('#networking-search').on('select2:close', () => {
        setTimeout(function() {
            $('.select2-container-active').removeClass('select2-container-active');
            $(':focus').blur();
        }, 1);
        $scope.$broadcast('awxNet-SearchDropdownClose');
    });

}

NetworkingController.$inject = [
    'canEdit',
    'inventory',
    '$state',
    '$scope',
    'awxNetStrings',
    'CreateSelect2'
];

export default NetworkingController;
/* eslint-disable */
