export default ['$rootScope', '$transitions', function($rootScope, $transitions) {
    return {
        restrict: 'E',
        scope: {
            maxPanels: '@',
            panelContainer: '@'
        },
        link: function(scope) {

            scope.maxPanels = parseInt(scope.maxPanels);

            $transitions.onSuccess({}, function() {
                let panels = angular.element('#' + scope.panelContainer).find('.Panel');

                if(panels.length > scope.maxPanels) {
                    // hide the excess panels
                    $(panels).each(function( index ) {
                        if(index+1 > scope.maxPanels) {
                            $(this).addClass('Panel-hidden');
                        }
                        else {
                            $(this).removeClass('Panel-hidden');
                        }
                    });
                }
                else {
                    // show all the panels
                    $(panels).removeClass('Panel-hidden');
                }
            });
        }
    };
}];
