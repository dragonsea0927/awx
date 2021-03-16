import { t } from '@lingui/macro';

import {
  UnifiedJobTemplatesAPI,
  CredentialsAPI,
  InventoriesAPI,
  InventorySourcesAPI,
  JobTemplatesAPI,
  ProjectsAPI,
  WorkflowJobTemplateNodesAPI,
  WorkflowJobTemplatesAPI,
  CredentialInputSourcesAPI,
  TeamsAPI,
  NotificationTemplatesAPI,
  ExecutionEnvironmentsAPI,
  ApplicationsAPI,
  OrganizationsAPI,
} from '../api';

export async function getRelatedResourceDeleteCounts(requests) {
  const results = {};
  let error = null;
  let hasCount = false;

  try {
    await Promise.all(
      requests.map(async ({ request, label }) => {
        const {
          data: { count },
        } = await request();

        if (count > 0) {
          results[label] = count;
          hasCount = true;
        }
      })
    );
  } catch (err) {
    error = err;
  }

  return {
    results: hasCount && results,
    error,
  };
}

export const relatedResourceDeleteRequests = {
  credential: (selected, i18n) => [
    {
      request: () =>
        JobTemplatesAPI.read({
          credentials: selected.id,
        }),
      label: i18n._(t`Job Templates`),
    },
    {
      request: () => ProjectsAPI.read({ credentials: selected.id }),
      label: i18n._(t`Projects`),
    },
    {
      request: () =>
        InventoriesAPI.read({
          insights_credential: selected.id,
        }),
      label: i18n._(t`Inventories`),
    },
    {
      request: () =>
        InventorySourcesAPI.read({
          credentials__id: selected.id,
        }),
      label: i18n._(t`Inventory Sources`),
    },
    {
      request: () =>
        CredentialInputSourcesAPI.read({
          source_credential: selected.id,
        }),
      label: i18n._(t`Credential`),
    },
    {
      request: () =>
        ExecutionEnvironmentsAPI.read({
          credential: selected.id,
        }),
      label: i18n._(t`Execution Environments`),
    },
  ],

  credentialType: (selected, i18n) => [
    {
      request: async () =>
        CredentialsAPI.read({
          credential_type__id: selected.id,
        }),
      label: i18n._(t`Credentials`),
    },
  ],

  inventory: (selected, i18n) => [
    {
      request: async () =>
        JobTemplatesAPI.read({
          inventory: selected.id,
        }),
      label: i18n._(t`Job Templates`),
    },
    {
      request: () => WorkflowJobTemplatesAPI.read({ inventory: selected.id }),
      label: i18n._(t`Workflow Job Template`),
    },
  ],

  inventorySource: (inventoryId, i18n) => [
    {
      request: async () => {
        try {
          const { data } = await InventoriesAPI.updateSources(inventoryId);
          let total = 0;
          await Promise.all(
            data.map(async datum => {
              const {
                data: { count },
              } = await WorkflowJobTemplateNodesAPI.read({
                unified_job_template: datum.inventory_source,
              });
              if (count > 0) {
                total += count;
              }
            })
          );
          console.log(total, 'total');
          return { data: { count: total } };
        } catch (err) {
          throw new Error(err);
        }
      },
      label: i18n._(t`Workflow Job Template Nodes`),
    },
  ],

  project: (selected, i18n) => [
    {
      request: () =>
        JobTemplatesAPI.read({
          project: selected.id,
        }),
      label: i18n._(t`Job Templates`),
    },
    {
      request: () =>
        WorkflowJobTemplateNodesAPI.read({
          unified_job_template: selected.id,
        }),
      label: i18n._(t`Workflow Job Templates`),
    },
    {
      request: () =>
        InventorySourcesAPI.read({
          source_project: selected.id,
        }),
      label: i18n._(t`Inventory Sources`),
    },
  ],

  template: (selected, i18n) => [
    {
      request: async () =>
        WorkflowJobTemplateNodesAPI.read({
          unified_job_template: selected.id,
        }),
      label: [i18n._(t`Workflow Job Template Nodes`)],
    },
  ],

  organization: (selected, i18n) => [
    {
      request: async () =>
        CredentialsAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Credential`),
    },
    {
      request: async () =>
        TeamsAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Teams`),
    },
    {
      request: async () =>
        NotificationTemplatesAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Notification Templates`),
    },
    {
      request: () =>
        ExecutionEnvironmentsAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Execution Environments`),
    },
    {
      request: async () =>
        ProjectsAPI.read({
          organization: selected.id,
        }),
      label: [i18n._(t`Projects`)],
    },
    {
      request: () =>
        InventoriesAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Inventories`),
    },
    {
      request: () =>
        ApplicationsAPI.read({
          organization: selected.id,
        }),
      label: i18n._(t`Applications`),
    },
  ],
  executionEnvironment: (selected, i18n) => [
    {
      request: async () =>
        UnifiedJobTemplatesAPI.read({
          execution_environment: selected.id,
        }),
      label: [i18n._(t`Templates`)],
    },
    {
      request: async () =>
        ProjectsAPI.read({
          default_environment: selected.id,
        }),
      label: [i18n._(t`Projects`)],
    },
    {
      request: async () =>
        OrganizationsAPI.read({
          default_environment: selected.id,
        }),
      label: [i18n._(t`Organizations`)],
    },
    {
      request: async () => {
        try {
          const {
            data: { results },
          } = await InventorySourcesAPI.read({
            execution_environment: selected.id,
          });
          let total = 0;
          await Promise.all(
            results.map(async result => {
              const {
                data: { count },
              } = await WorkflowJobTemplateNodesAPI.read({
                unified_job_template: result.id,
              });
              if (count > 0) {
                total += count;
              }
            })
          );
          return { data: { count: total } };
        } catch (err) {
          throw new Error(err);
        }
      },
      label: [i18n._(t`Workflow Job Template Nodes`)],
    },
  ],
};
