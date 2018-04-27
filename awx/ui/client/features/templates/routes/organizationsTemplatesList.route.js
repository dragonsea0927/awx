import { N_ } from '../../../src/i18n';
import templatesListController from '../templatesList.controller';
import indexController from '../index.controller';

const indexTemplate = require('~features/templates/index.view.html');
const templatesListTemplate = require('~features/templates/templatesList.view.html');

export default {
    url: "/:organization_id/job_templates",
    name: 'organizations.job_templates',
    params: {
        template_search: {
            dynamic: true,
            value: {
                type: 'workflow_job_template,job_template',
            },
        }
    },
    ncyBreadcrumb: {
        label: N_("JOB TEMPLATES")
    },
    views: {
        'form': {
            templateUrl: indexTemplate,
            controller: indexController,
            controllerAs: 'vm'
        },
        'templatesList@organizations.job_templates': {
            controller: templatesListController,
            templateUrl: templatesListTemplate,
            controllerAs: 'vm',
        }
    },
    resolve: {
        resolvedModels: [
            'JobTemplateModel',
            'WorkflowJobTemplateModel',
            (JobTemplate, WorkflowJobTemplate) => {
                const models = [
                    new JobTemplate(['options']),
                    new WorkflowJobTemplate(['options']),
                ];
                return Promise.all(models);
            },
        ],
        Dataset: [
            '$stateParams',
            'Wait',
            'GetBasePath',
            'QuerySet',
            ($stateParams, Wait, GetBasePath, qs) => {
                const searchPath = GetBasePath('unified_job_templates');

                const searchParam = _.assign($stateParams.template_search, {
                    or__project__organization: $stateParams.organization_id,
                    or__jobtemplate__inventory__organization: $stateParams.organization_id,
                });

                Wait('start');
                return qs.search(searchPath, searchParam)
                    .finally(() => Wait('stop'));
            }
        ],
    }
};
