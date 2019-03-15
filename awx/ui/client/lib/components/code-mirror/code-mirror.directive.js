const templateUrl = require('~components/code-mirror/code-mirror.partial.html');

const CodeMirrorModalID = '#CodeMirror-modal';
const ParseVariable = 'parseType';
const ParseType = 'yaml';

function atCodeMirrorController (
    $scope,
    strings,
    ParseTypeChange,
    ParseVariableString
) {
    const vm = this;
    const variablesName = `${$scope.name}_variables`;
    function init (vars, name) {
        console.log('init', $scope, vars);
        if ($scope.disabled === 'true') {
            $scope.disabled = true;
        } else if ($scope.disabled === 'false') {
            $scope.disabled = false;
        }
        $scope.variablesName = variablesName;
        // $scope[variablesName] = ParseVariableString(_.cloneDeep(vars));
        $scope.variables = {
            value: ParseVariableString(_.cloneDeep(vars)),
        };
        $scope.value = $scope.variables.value;
        $scope.parseType = ParseType;
        const options = {
            scope: $scope,
            variable: 'value', // variablesName,
            parse_variable: ParseVariable,
            field_id: name,
            readOnly: $scope.disabled,
            onChange: (value) => {
                console.log('change', value);
            },
        };
        ParseTypeChange(options);
    }

    function expand () {
        vm.expanded = true;
    }

    function close () {
        $(CodeMirrorModalID).off('hidden.bs.modal');
        $(CodeMirrorModalID).modal('hide');
        $('.popover').popover('hide');
        vm.expanded = false;
    }

    // vm.variablesName = variablesName;
    vm.name = $scope.name;
    vm.modalName = `${vm.name}_modal`;
    vm.strings = strings;
    vm.expanded = false;
    vm.close = close;
    vm.expand = expand;
    if ($scope.init) {
        $scope.init = init;
    }
    angular.element(document).ready(() => {
        init($scope.variables, $scope.name);
    });
}

atCodeMirrorController.$inject = [
    '$scope',
    'CodeMirrorStrings',
    'ParseTypeChange',
    'ParseVariableString'
];

function atCodeMirrorTextarea () {
    return {
        restrict: 'E',
        replace: true,
        transclude: true,
        templateUrl,
        controller: atCodeMirrorController,
        controllerAs: 'vm',
        scope: {
            disabled: '@',
            label: '@',
            labelClass: '@',
            tooltip: '@',
            tooltipPlacement: '@',
            variables: '@',
            name: '@',
            init: '='
        }
    };
}

export default atCodeMirrorTextarea;
