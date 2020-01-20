import React, { useState, useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { func, shape } from 'prop-types';
import { WorkflowJobTemplatesAPI } from '@api';
import { getQSConfig, parseQueryString } from '@util/qs';
import PaginatedDataList from '@components/PaginatedDataList';
import DataListToolbar from '@components/DataListToolbar';
import CheckboxListItem from '@components/CheckboxListItem';

const QS_CONFIG = getQSConfig('workflow_job_templates', {
  page: 1,
  page_size: 5,
  order_by: 'name',
});

function WorkflowJobTemplatesList({
  history,
  i18n,
  nodeResource,
  updateNodeResource,
}) {
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowJobTemplates, setWorkflowJobTemplates] = useState([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setWorkflowJobTemplates([]);
      setCount(0);
      const params = parseQueryString(QS_CONFIG, history.location.search);
      try {
        const { data } = await WorkflowJobTemplatesAPI.read(params, {
          role_level: 'execute_role',
        });
        setWorkflowJobTemplates(data.results);
        setCount(data.count);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [history.location]);

  return (
    <PaginatedDataList
      contentError={error}
      hasContentLoading={isLoading}
      itemCount={count}
      items={workflowJobTemplates}
      onRowClick={row => updateNodeResource(row)}
      qsConfig={QS_CONFIG}
      renderItem={item => (
        <CheckboxListItem
          isSelected={!!(nodeResource && nodeResource.id === item.id)}
          itemId={item.id}
          key={item.id}
          name={item.name}
          label={item.name}
          onSelect={() => updateNodeResource(item)}
          onDeselect={() => updateNodeResource(null)}
          isRadio
        />
      )}
      renderToolbar={props => <DataListToolbar {...props} fillWidth />}
      showPageSizeOptions={false}
      toolbarColumns={[
        {
          name: i18n._(t`Name`),
          key: 'name',
          isSortable: true,
          isSearchable: true,
        },
      ]}
    />
  );
}

WorkflowJobTemplatesList.propTypes = {
  nodeResource: shape(),
  updateNodeResource: func.isRequired,
};

WorkflowJobTemplatesList.defaultProps = {
  nodeResource: null,
};

export default withI18n()(withRouter(WorkflowJobTemplatesList));
