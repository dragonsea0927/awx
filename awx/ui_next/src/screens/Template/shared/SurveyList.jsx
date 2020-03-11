import React, { useEffect, useCallback, useState } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';

import useRequest from '@util/useRequest';
import { Button } from '@patternfly/react-core';

import ContentError from '@components/ContentError';
import ContentLoading from '@components/ContentLoading';
import ErrorDetail from '@components/ErrorDetail';
import { JobTemplatesAPI } from '@api';
import ContentEmpty from '@components/ContentEmpty';
import AlertModal from '@components/AlertModal';
import SurveyListItem from './SurveyListItem';
import SurveyToolbar from './SurveyToolbar';

// survey.name
// survey.description
// survey.spec
function SurveyList({
  survey,
  surveyEnabled,
  toggleSurvey,
  updateSurvey,
  deleteSurvey,
  i18n,
}) {
  const questions = survey?.spec || [];
  const [selected, setSelected] = useState([]);
  // const [showError, setShowError] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isAllSelected =
    selected.length === questions?.length && selected.length > 0;

  const handleSelectAll = isSelected => {
    setSelected(isSelected ? [...questions] : []);
  };

  const handleSelect = item => {
    if (selected.some(s => s.id === item.id)) {
      setSelected(selected.filter(s => s.id !== item.id));
    } else {
      setSelected(selected.concat(item));
    }
  };

  const handleDelete = async () => {
    if (isAllSelected) {
      await deleteSurvey();
    } else {
      await updateSurvey(questions.filter(q => !selected.includes(q)));
    }
    setIsDeleteModalOpen(false);
    setSelected([]);
  };

  const moveUp = question => {
    const index = questions.indexOf(question);
    if (index < 1) {
      return;
    }
    const beginning = questions.slice(0, index - 1);
    const swapWith = questions[index - 1];
    const end = questions.slice(index + 1);
    updateSurvey([...beginning, question, swapWith, ...end]);
  };
  const moveDown = question => {
    const index = questions.indexOf(question);
    if (index === -1 || index > questions.length - 1) {
      return;
    }
    const beginning = questions.slice(0, index);
    const swapWith = questions[index + 1];
    const end = questions.slice(index + 2);
    updateSurvey([...beginning, swapWith, question, ...end]);
  };

  let content;
  // TODO
  if (false) {
    content = <ContentLoading />;
  } else if (!questions || questions?.length <= 0) {
    content = (
      <ContentEmpty
        title={i18n._(t`No Survey Questions Found`)}
        message={i18n._(t`Please add survey questions.`)}
      />
    );
  } else {
    content = questions?.map((question, index) => (
      <SurveyListItem
        key={question.variable}
        isLast={index === questions.length - 1}
        isFirst={index === 0}
        question={question}
        isChecked={selected.some(s => s.id === question.id)}
        onSelect={() => handleSelect(question)}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
      />
    ));
  }

  // const error = deletionError || toggleError || updateError;
  // let errorMessage = '';
  // if (updateError) {
  //   errorMessage = i18n._(t`Failed to update survey`);
  // }
  // if (toggleError) {
  //   errorMessage = i18n._(t`Failed to toggle survey`);
  // }
  // if (deletionError) {
  //   errorMessage = i18n._(t`Failed to delete survey`);
  // }
  // useEffect(() => {
  //   if (error) {
  //     setShowError(true);
  //   }
  // }, [error]);

  return (
    <>
      <SurveyToolbar
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        surveyEnabled={surveyEnabled}
        onToggleSurvey={toggleSurvey}
        isDeleteDisabled={selected?.length === 0}
        onToggleDeleteModal={() => setIsDeleteModalOpen(true)}
      />
      {content}
      {isDeleteModalOpen && (
        <AlertModal
          variant="danger"
          title={
            isAllSelected
              ? i18n._(t`Delete Survey`)
              : i18n._(t`Delete Questions`)
          }
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelected([]);
          }}
          actions={[
            <Button
              key="delete"
              variant="danger"
              aria-label={i18n._(t`confirm delete`)}
              onClick={handleDelete}
            >
              {i18n._(t`Delete`)}
            </Button>,
            <Button
              key="cancel"
              variant="secondary"
              aria-label={i18n._(t`cancel delete`)}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelected([]);
              }}
            >
              {i18n._(t`Cancel`)}
            </Button>,
          ]}
        >
          <div>{i18n._(t`This action will delete the following:`)}</div>
          {selected.map(question => (
            <span key={question.id}>
              <strong>{question.question_name}</strong>
              <br />
            </span>
          ))}
        </AlertModal>
      )}
      {/* {showError && (
        <AlertModal
          isOpen={showError}
          variant="error"
          title={i18n._(t`Error!`)}
          onClose={() => setShowError(false)}
        >
          {errorMessage}
          <ErrorDetail error={error} />
        </AlertModal>
      )} */}
    </>
  );
}

export default withI18n()(SurveyList);
