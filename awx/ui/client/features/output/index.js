import atLibModels from '~models';
import atLibComponents from '~components';

import Strings from '~features/output/jobs.strings';
import Controller from '~features/output/index.controller';
import PageService from '~features/output/page.service';
import RenderService from '~features/output/render.service';
import ScrollService from '~features/output/scroll.service';
import EngineService from '~features/output/engine.service';
import StatusService from '~features/output/status.service';
import MessageService from '~features/output/message.service';
import LegacyRedirect from '~features/output/legacy.route';

import DetailsComponent from '~features/output/details.component';
import SearchComponent from '~features/output/search.component';
import StatsComponent from '~features/output/stats.component';
import HostEvent from './host-event/index';

const Template = require('~features/output/index.view.html');

const MODULE_NAME = 'at.features.output';

const PAGE_CACHE = true;
const PAGE_LIMIT = 5;
const PAGE_SIZE = 50;
const WS_PREFIX = 'ws';

function resolveResource (
    Job,
    ProjectUpdate,
    AdHocCommand,
    SystemJob,
    WorkflowJob,
    InventoryUpdate,
    $stateParams,
    qs,
    Wait
) {
    const { id, type, job_event_search } = $stateParams; // eslint-disable-line camelcase
    const { name, key } = getWebSocketResource(type);

    let Resource;
    let related = 'events';

    switch (type) {
        case 'project':
            Resource = ProjectUpdate;
            break;
        case 'playbook':
            Resource = Job;
            related = 'job_events';
            break;
        case 'command':
            Resource = AdHocCommand;
            break;
        case 'system':
            Resource = SystemJob;
            break;
        case 'inventory':
            Resource = InventoryUpdate;
            break;
        // case 'workflow':
            // todo: integrate workflow chart components into this view
            // break;
        default:
            // Redirect
            return null;
    }

    const params = { page_size: PAGE_SIZE, order_by: 'start_line' };
    const config = { pageCache: PAGE_CACHE, pageLimit: PAGE_LIMIT, params };

    if (job_event_search) { // eslint-disable-line camelcase
        const queryParams = qs.encodeQuerysetObject(qs.decodeArr(job_event_search));

        Object.assign(config.params, queryParams);
    }

    Wait('start');
    return new Resource(['get', 'options'], [id, id])
        .then(model => {
            const promises = [model.getStats()];

            if (model.has('related.labels')) {
                promises.push(model.extend('get', 'labels'));
            }

            promises.push(model.extend('get', related, config));

            return Promise.all(promises);
        })
        .then(([stats, model]) => ({
            id,
            type,
            stats,
            model,
            related,
            ws: {
                events: `${WS_PREFIX}-${key}-${id}`,
                status: `${WS_PREFIX}-${name}`,
            },
            page: {
                cache: PAGE_CACHE,
                size: PAGE_SIZE,
                pageLimit: PAGE_LIMIT
            }
        }))
        .catch(({ data, status }) => qs.error(data, status))
        .finally(() => Wait('stop'));
}

function resolveWebSocketConnection ($stateParams, SocketService) {
    const { type, id } = $stateParams;
    const { name, key } = getWebSocketResource(type);

    const state = {
        data: {
            socket: {
                groups: {
                    [name]: ['status_changed', 'summary'],
                    [key]: []
                }
            }
        }
    };

    return SocketService.addStateResolve(state, id);
}

function getWebSocketResource (type) {
    let name;
    let key;

    switch (type) {
        case 'system':
            name = 'jobs';
            key = 'system_job_events';
            break;
        case 'project':
            name = 'jobs';
            key = 'project_update_events';
            break;
        case 'command':
            name = 'jobs';
            key = 'ad_hoc_command_events';
            break;
        case 'inventory':
            name = 'jobs';
            key = 'inventory_update_events';
            break;
        case 'playbook':
            name = 'jobs';
            key = 'job_events';
            break;
        default:
            throw new Error('Unsupported WebSocket type');
    }

    return { name, key };
}

function JobsRun ($stateRegistry, strings) {
    const parent = 'jobs';
    const ncyBreadcrumb = { parent, label: strings.get('state.BREADCRUMB_DEFAULT') };

    const state = {
        url: '/:type/:id?job_event_search',
        name: 'output',
        parent,
        ncyBreadcrumb,
        data: {
            activityStream: false,
        },
        views: {
            '@': {
                templateUrl: Template,
                controller: Controller,
                controllerAs: 'vm'
            },
        },
        resolve: {
            webSocketConnection: [
                '$stateParams',
                'SocketService',
                resolveWebSocketConnection
            ],
            resource: [
                'JobModel',
                'ProjectUpdateModel',
                'AdHocCommandModel',
                'SystemJobModel',
                'WorkflowJobModel',
                'InventoryUpdateModel',
                '$stateParams',
                'QuerySet',
                'Wait',
                resolveResource
            ],
            breadcrumbLabel: [
                'resource',
                ({ model }) => {
                    ncyBreadcrumb.label = `${model.get('id')} - ${model.get('name')}`;
                }
            ],
        },
    };

    $stateRegistry.register(state);
}

JobsRun.$inject = ['$stateRegistry', 'JobStrings'];

angular
    .module(MODULE_NAME, [
        atLibModels,
        atLibComponents,
        HostEvent
    ])
    .service('JobStrings', Strings)
    .service('JobPageService', PageService)
    .service('JobScrollService', ScrollService)
    .service('JobRenderService', RenderService)
    .service('JobEventEngine', EngineService)
    .service('JobStatusService', StatusService)
    .service('JobMessageService', MessageService)
    .component('atJobSearch', SearchComponent)
    .component('atJobStats', StatsComponent)
    .component('atJobDetails', DetailsComponent)
    .run(JobsRun)
    .run(LegacyRedirect);

export default MODULE_NAME;
