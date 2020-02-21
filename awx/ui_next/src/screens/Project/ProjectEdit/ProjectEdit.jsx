import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Card } from '@patternfly/react-core';
import { CardBody } from '@components/Card';
import ProjectForm from '../shared/ProjectForm';
import { ProjectsAPI } from '@api';

function ProjectEdit({ project }) {
  const [formSubmitError, setFormSubmitError] = useState(null);
  const history = useHistory();

  const handleSubmit = async values => {
    if (values.scm_type === 'manual') {
      values.scm_type = '';
    }
    try {
      const {
        data: { id },
      } = await ProjectsAPI.update(project.id, values);
      history.push(`/projects/${id}/details`);
    } catch (error) {
      setFormSubmitError(error);
    }
  };

  const handleCancel = () => {
    history.push(`/projects/${project.id}/details`);
  };

  return (
    <Card>
      <CardBody>
        <ProjectForm
          project={project}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          submitError={formSubmitError}
        />
      </CardBody>
    </Card>
  );
}

export default ProjectEdit;
