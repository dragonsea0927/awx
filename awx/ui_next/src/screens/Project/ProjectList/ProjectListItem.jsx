import 'styled-components/macro';
import React, { Fragment, useState, useCallback } from 'react';
import { string, bool, func } from 'prop-types';
import { withI18n } from '@lingui/react';
import { Button, Tooltip } from '@patternfly/react-core';
import { Tr, Td, ExpandableRowContent } from '@patternfly/react-table';
import { t } from '@lingui/macro';
import { Link } from 'react-router-dom';
import {
  PencilAltIcon,
  ExclamationTriangleIcon as PFExclamationTriangleIcon,
} from '@patternfly/react-icons';
import styled from 'styled-components';
import { ActionsTd, ActionItem } from '../../../components/PaginatedTable';
import { formatDateString, timeOfDay } from '../../../util/dates';
import { ProjectsAPI } from '../../../api';
import ClipboardCopyButton from '../../../components/ClipboardCopyButton';
import {
  DetailList,
  Detail,
  DeletedDetail,
} from '../../../components/DetailList';
import ExecutionEnvironmentDetail from '../../../components/ExecutionEnvironmentDetail';
import StatusLabel from '../../../components/StatusLabel';
import { toTitleCase } from '../../../util/strings';
import CopyButton from '../../../components/CopyButton';
import ProjectSyncButton from '../shared/ProjectSyncButton';
import { Project } from '../../../types';

const Label = styled.span`
  color: var(--pf-global--disabled-color--100);
`;

const ExclamationTriangleIcon = styled(PFExclamationTriangleIcon)`
  color: var(--pf-global--warning-color--100);
  margin-left: 18px;
`;

function ProjectListItem({
  project,
  isSelected,
  onSelect,
  detailUrl,
  fetchProjects,
  rowIndex,
  i18n,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  ProjectListItem.propTypes = {
    project: Project.isRequired,
    detailUrl: string.isRequired,
    isSelected: bool.isRequired,
    onSelect: func.isRequired,
  };

  const copyProject = useCallback(async () => {
    await ProjectsAPI.copy(project.id, {
      name: `${project.name} @ ${timeOfDay()}`,
    });
    await fetchProjects();
  }, [project.id, project.name, fetchProjects]);

  const generateLastJobTooltip = job => {
    return (
      <Fragment>
        <div>{i18n._(t`MOST RECENT SYNC`)}</div>
        <div>
          {i18n._(t`JOB ID:`)} {job.id}
        </div>
        <div>
          {i18n._(t`STATUS:`)} {job.status.toUpperCase()}
        </div>
        {job.finished && (
          <div>
            {i18n._(t`FINISHED:`)} {formatDateString(job.finished)}
          </div>
        )}
      </Fragment>
    );
  };

  const handleCopyStart = useCallback(() => {
    setIsDisabled(true);
  }, []);

  const handleCopyFinish = useCallback(() => {
    setIsDisabled(false);
  }, []);

  const labelId = `check-action-${project.id}`;

  const missingExecutionEnvironment =
    project.custom_virtualenv && !project.default_environment;

  let job = null;

  if (project.summary_fields?.current_job) {
    job = project.summary_fields.current_job;
  } else if (project.summary_fields?.last_job) {
    job = project.summary_fields.last_job;
  }

  return (
    <>
      <Tr id={`${project.id}`}>
        <Td
          expand={{
            rowIndex,
            isExpanded,
            onToggle: () => setIsExpanded(!isExpanded),
          }}
        />
        <Td
          select={{
            rowIndex,
            isSelected,
            onSelect,
          }}
          dataLabel={i18n._(t`Selected`)}
        />
        <Td id={labelId} dataLabel={i18n._(t`Name`)}>
          <span>
            <Link to={`${detailUrl}`}>
              <b>{project.name}</b>
            </Link>
          </span>
          {missingExecutionEnvironment && (
            <span>
              <Tooltip
                content={i18n._(
                  t`Custom virtual environment ${project.custom_virtualenv} must be replaced by an execution environment.`
                )}
                position="right"
                className="missing-execution-environment"
              >
                <ExclamationTriangleIcon />
              </Tooltip>
            </span>
          )}
        </Td>
        <Td dataLabel={i18n._(t`Status`)}>
          {job && (
            <Tooltip
              position="top"
              content={generateLastJobTooltip(job)}
              key={job.id}
            >
              <Link to={`/jobs/project/${job.id}`}>
                <StatusLabel status={job.status} />
              </Link>
            </Tooltip>
          )}
        </Td>
        <Td dataLabel={i18n._(t`Type`)}>
          {project.scm_type === ''
            ? i18n._(t`Manual`)
            : toTitleCase(project.scm_type)}
        </Td>
        <Td dataLabel={i18n._(t`Revision`)}>
          {project.scm_revision.substring(0, 7)}
          {!project.scm_revision && (
            <Label aria-label={i18n._(t`copy to clipboard disabled`)}>
              {i18n._(t`Sync for revision`)}
            </Label>
          )}
          <ClipboardCopyButton
            isDisabled={!project.scm_revision}
            stringToCopy={project.scm_revision}
            copyTip={i18n._(t`Copy full revision to clipboard.`)}
            copiedSuccessTip={i18n._(t`Successfully copied to clipboard!`)}
            ouiaId="copy-revision-button"
          />
        </Td>
        <ActionsTd dataLabel={i18n._(t`Actions`)}>
          <ActionItem
            visible={project.summary_fields.user_capabilities.start}
            tooltip={i18n._(t`Sync Project`)}
          >
            <ProjectSyncButton
              projectId={project.id}
              lastJobStatus={job && job.status}
            />
          </ActionItem>
          <ActionItem
            visible={project.summary_fields.user_capabilities.edit}
            tooltip={i18n._(t`Edit Project`)}
          >
            <Button
              ouiaId={`${project.id}-edit-button`}
              isDisabled={isDisabled}
              aria-label={i18n._(t`Edit Project`)}
              variant="plain"
              component={Link}
              to={`/projects/${project.id}/edit`}
            >
              <PencilAltIcon />
            </Button>
          </ActionItem>
          <ActionItem
            tooltip={i18n._(t`Copy Project`)}
            visible={project.summary_fields.user_capabilities.copy}
          >
            <CopyButton
              copyItem={copyProject}
              isDisabled={isDisabled}
              onCopyStart={handleCopyStart}
              onCopyFinish={handleCopyFinish}
              errorMessage={i18n._(t`Failed to copy project.`)}
            />
          </ActionItem>
        </ActionsTd>
      </Tr>
      <Tr isExpanded={isExpanded} id={`expanded-project-row-${project.id}`}>
        <Td colSpan={2} />
        <Td colSpan={5}>
          <ExpandableRowContent>
            <DetailList>
              <Detail
                label={i18n._(t`Description`)}
                value={project.description}
                dataCy={`project-${project.id}-description`}
              />
              {project.summary_fields.organization ? (
                <Detail
                  label={i18n._(t`Organization`)}
                  value={
                    <Link
                      to={`/organizations/${project.summary_fields.organization.id}/details`}
                    >
                      {project.summary_fields.organization.name}
                    </Link>
                  }
                  dataCy={`project-${project.id}-organization`}
                />
              ) : (
                <DeletedDetail label={i18n._(t`Organization`)} />
              )}
              <ExecutionEnvironmentDetail
                virtualEnvironment={project.custom_virtualenv}
                executionEnvironment={
                  project.summary_fields?.default_environment
                }
                isDefaultEnvironment
              />
              <Detail
                label={i18n._(t`Last modified`)}
                value={formatDateString(project.modified)}
                dataCy={`project-${project.id}-last-modified`}
              />
              <Detail
                label={i18n._(t`Last used`)}
                value={formatDateString(project.last_job_run)}
                dataCy={`project-${project.id}-last-used`}
              />
            </DetailList>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </>
  );
}
export default withI18n()(ProjectListItem);
