/*************************************************
 * Copyright (c) 2016 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/


export default ['$stateParams', '$scope', '$rootScope',
    'Rest', 'OrganizationList', 'Prompt', 'OrganizationModel',
    'ProcessErrors', 'GetBasePath', 'Wait', '$state',
    'rbacUiControlService', '$filter', 'Dataset', 'i18n',
    'AppStrings',
    function($stateParams, $scope, $rootScope,
        Rest, OrganizationList, Prompt, Organization,
        ProcessErrors, GetBasePath, Wait, $state,
        rbacUiControlService, $filter, Dataset, i18n,
        AppStrings
    ) {

        var defaultUrl = GetBasePath('organizations'),
            list = OrganizationList;

        $scope.canAdd = false;

        rbacUiControlService.canAdd("organizations")
            .then(function(params) {
                $scope.canAdd = params.canAdd;
            });
        $scope.orgCount = Dataset.data.count;

        // search init
        $scope.list = list;
        $scope[`${list.iterator}_dataset`] = Dataset.data;
        $scope[list.name] = $scope[`${list.iterator}_dataset`].results;

        $scope.orgCards = parseCardData($scope[list.name]);
        $rootScope.flashMessage = null;

        // grab the pagination elements, move, destroy list generator elements
        $('#organization-pagination').appendTo('#OrgCards');
        $('#organizations tag-search').appendTo('.OrgCards-search');
        $('#organizations-list').remove();

        function parseCardData(cards) {
            return cards.map(function(card) {
                var val = {},
                    url = '/#/organizations/' + card.id + '/';
                val.user_capabilities = card.summary_fields.user_capabilities;
                val.name = card.name;
                val.id = card.id;
                val.description = card.description || undefined;
                val.links = [];
                val.links.push({
                    href: url + 'users',
                    name: i18n._("USERS"),
                    count: card.summary_fields.related_field_counts.users,
                    activeMode: 'users'
                });
                val.links.push({
                    href: url + 'teams',
                    name: i18n._("TEAMS"),
                    count: card.summary_fields.related_field_counts.teams,
                    activeMode: 'teams'
                });
                val.links.push({
                    href: url + 'inventories',
                    name: i18n._("INVENTORIES"),
                    count: card.summary_fields.related_field_counts.inventories,
                    activeMode: 'inventories'
                });
                val.links.push({
                    href: url + 'projects',
                    name: i18n._("PROJECTS"),
                    count: card.summary_fields.related_field_counts.projects,
                    activeMode: 'projects'
                });
                val.links.push({
                    href: url + 'job_templates',
                    name: i18n._("JOB TEMPLATES"),
                    count: card.summary_fields.related_field_counts.job_templates,
                    activeMode: 'job_templates'
                });
                val.links.push({
                    href: url + 'admins',
                    name: i18n._("ADMINS"),
                    count: card.summary_fields.related_field_counts.admins,
                    activeMode: 'admins'
                });
                return val;
            });
        }

        $scope.$on("ReloadOrgListView", function() {
            Rest.setUrl($scope.current_url);
            Rest.get()
                .then(({data}) => $scope.organizations = data.results)
                .catch(({data, status}) => {
                    ProcessErrors($scope, data, status, null, {
                        hdr: 'Error!',
                        msg: 'Call to ' + defaultUrl + ' failed. DELETE returned status: ' + status
                    });
            });
        });


        $scope.$watchCollection('organizations', function(value){
            $scope.orgCards = parseCardData(value);
        });

        if ($scope.removePostRefresh) {
            $scope.removePostRefresh();
        }

        $scope.$watchCollection(`${list.iterator}_dataset`, function(data) {
            $scope[list.name] = data.results;
            $scope.orgCards = parseCardData($scope[list.name]);
        });

        $scope.addOrganization = function() {
            $state.transitionTo('organizations.add');
        };

        $scope.editOrganization = function(id) {
            $state.transitionTo('organizations.edit', {
                organization_id: id
            });
        };

        function isDeletedOrganizationBeingEdited(deleted_organization_id, editing_organization_id) {
            if (editing_organization_id === undefined) {
                return false;
            }
            if (deleted_organization_id === editing_organization_id) {
                return true;
            }
            return false;
        }

        $scope.deleteOrganization = function(id, name) {

            var action = function() {
                $('#prompt-modal').modal('hide');
                Wait('start');
                var url = defaultUrl + id + '/';
                Rest.setUrl(url);
                Rest.destroy()
                    .then(() => {
                        Wait('stop');

                        let reloadListStateParams = null;

                        if($scope.organizations.length === 1 && $state.params.organization_search && _.has($state, 'params.organization_search.page') && parseInt($state.params.organization_search.page).toString() !== '1') {
                            reloadListStateParams = _.cloneDeep($state.params);
                            reloadListStateParams.organization_search.page = (parseInt(reloadListStateParams.organization_search.page)-1).toString();
                        }

                        if (isDeletedOrganizationBeingEdited(id, parseInt($stateParams.organization_id)) === true) {
                            $state.go('^', reloadListStateParams, { reload: true });
                        } else {
                            $state.go('.', reloadListStateParams, { reload: true });
                        }
                    })
                    .catch(({data, status}) => {
                        ProcessErrors($scope, data, status, null, {
                            hdr: 'Error!',
                            msg: 'Call to ' + url + ' failed. DELETE returned status: ' + status
                        });
                    });
            };

            const organization = new Organization();

            organization.getDependentResourceCounts(id)
                .then((counts) => {
                    const invalidateRelatedLines = [];
                    let deleteModalBody = `<div class="Prompt-bodyQuery">${AppStrings.get('deleteResource.CONFIRM', 'organization')}</div>`;

                    counts.forEach(countObj => {
                        if(countObj.count && countObj.count > 0) {
                            invalidateRelatedLines.push(`<div><span class="Prompt-warningResourceTitle">${countObj.label}</span><span class="badge List-titleBadge">${countObj.count}</span></div>`);
                        }
                    });

                    if (invalidateRelatedLines && invalidateRelatedLines.length > 0) {
                        deleteModalBody = `<div class="Prompt-bodyQuery">${AppStrings.get('deleteResource.UNAVAILABLE', 'organization')} ${AppStrings.get('deleteResource.CONFIRM', 'organization')}</div>`;
                        invalidateRelatedLines.forEach(invalidateRelatedLine => {
                            deleteModalBody += invalidateRelatedLine;
                        });
                    }

                    Prompt({
                        hdr: i18n._('Delete'),
                        resourceName: $filter('sanitize')(name),
                        body: deleteModalBody,
                        action: action,
                        actionText: i18n._('DELETE')
                    });
                });
        };
    }
];
