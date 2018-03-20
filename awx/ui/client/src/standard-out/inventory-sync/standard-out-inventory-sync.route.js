/*************************************************
 * Copyright (c) 2016 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

import {templateUrl} from '../../shared/template-url/template-url.factory';

// TODO: figure out what this route should be - should it be inventory_sync?

export default {
    name: 'inventorySyncStdout',
    route: '/inventory_sync/:id',
    templateUrl: templateUrl('standard-out/inventory-sync/standard-out-inventory-sync'),
    controller: 'JobStdoutController',
    ncyBreadcrumb: {
        parent: "jobs",
        label: "{{ inventory_source_name }}"
    },
    data: {
        socket: {
            "groups":{
                "jobs": ["status_changed", "summary"],
                "inventory_update_events": [],
            }
        },
        jobType: 'inventory_updates'
    },
    resolve: {
        jobData: ['Rest', 'GetBasePath', '$stateParams', function(Rest, GetBasePath, $stateParams) {
            Rest.setUrl(GetBasePath('base') + 'inventory_updates/' + $stateParams.id + '/');
            return Rest.get()
                .then(({data}) => {
                    return data;
                });
        }]
    }
};
