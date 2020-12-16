import React, { useContext } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  WorkflowDispatchContext,
  WorkflowStateContext,
} from '../../../../../contexts/Workflow';
import NodeModal from './NodeModal';
import { getAddedAndRemoved } from '../../../../../util/lists';

function NodeAddModal({ i18n }) {
  const dispatch = useContext(WorkflowDispatchContext);
  const { addNodeSource } = useContext(WorkflowStateContext);

  const addNode = (values, linkType, config) => {
    const { approvalName, approvalDescription, approvalTimeout } = values;
    if (values) {
      const { added, removed } = getAddedAndRemoved(
        config?.defaults?.credentials,
        values?.credentials
      );

      values.inventory = values?.inventory?.id;
      values.addedCredentials = added;
      values.removedCredentials = removed;
    }
    let node;
    if (values.nodeType === 'approval') {
      node = {
        nodeResource: {
          description: approvalDescription,
          name: approvalName,
          timeout: approvalTimeout,
          type: 'workflow_approval_template',
        },
      };
    } else {
      node = {
        linkType,
        nodeResource: values.nodeResource,
      };
      if (
        values?.nodeType === 'job_template' ||
        values?.nodeType === 'workflow_job_template'
      ) {
        node.promptValues = values;
      }
    }
    dispatch({
      type: 'CREATE_NODE',
      node,
    });
  };

  return (
    <NodeModal
      askLinkType={addNodeSource !== 1}
      onSave={addNode}
      title={i18n._(t`Add Node`)}
    />
  );
}

export default withI18n()(NodeAddModal);
