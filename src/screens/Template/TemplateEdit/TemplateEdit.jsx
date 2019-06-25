import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter, Redirect } from 'react-router-dom';
import { CardBody } from '@patternfly/react-core';
import TemplateForm from '../shared/TemplateForm';
import { JobTemplatesAPI } from '@api';
import { JobTemplate } from '@types';

class TemplateEdit extends Component {
  static propTypes = {
    template: JobTemplate.isRequired,
    hasPermissions: PropTypes.bool.isRequired,
  };

  constructor (props) {
    super(props);

    this.state = {
      error: ''
    };

    this.handleCancel = this.handleCancel.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  async handleSubmit (values) {
    const { template: { id, type }, history } = this.props;

    try {
      await JobTemplatesAPI.update(id, { ...values });
      history.push(`/templates/${type}/${id}/details`);
    } catch (error) {
      this.setState({ error });
    }
  }

  handleCancel () {
    const { template: { id, type }, history } = this.props;
    history.push(`/templates/${type}/${id}/details`);
  }

  render () {
    const { template, hasPermissions } = this.props;
    const { error } = this.state;

    if (!hasPermissions) {
      const { template: { id, type } } = this.props;
      return <Redirect to={`/templates/${type}/${id}/details`} />;
    }

    return (
      <CardBody>
        <TemplateForm
          template={template}
          handleCancel={this.handleCancel}
          handleSubmit={this.handleSubmit}
        />
        {error ? <div> error </div> : null}
      </CardBody>
    );
  }
}

export default withRouter(TemplateEdit);
