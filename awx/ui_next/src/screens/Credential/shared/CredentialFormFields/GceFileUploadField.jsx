import React, { useState } from 'react';

import { t } from '@lingui/macro';
import { useField } from 'formik';
import { FileUpload, FormGroup } from '@patternfly/react-core';

function GceFileUploadField() {
  const [fileError, setFileError] = useState(null);
  const [filename, setFilename] = useState('');
  const [file, setFile] = useState('');
  const [, , inputsUsernameHelpers] = useField({
    name: 'inputs.username',
  });
  const [, , inputsProjectHelpers] = useField({
    name: 'inputs.project',
  });
  const [, , inputsSSHKeyDataHelpers] = useField({
    name: 'inputs.ssh_key_data',
  });
  return (
    <FormGroup
      fieldId="credential-gce-file"
      validated={!fileError ? 'default' : 'error'}
      label={t`Service account JSON file`}
      helperText={t`Select a JSON formatted service account key to autopopulate the following fields.`}
      helperTextInvalid={fileError}
    >
      <FileUpload
        id="credential-gce-file"
        value={file}
        filename={filename}
        filenamePlaceholder={t`Choose a .json file`}
        onChange={async value => {
          if (value) {
            try {
              setFile(value);
              setFilename(value.name);
              const fileText = await value.text();
              const fileJSON = JSON.parse(fileText);
              if (
                !fileJSON.client_email &&
                !fileJSON.project_id &&
                !fileJSON.private_key
              ) {
                setFileError(
                  t`Expected at least one of client_email, project_id or private_key to be present in the file.`
                );
              } else {
                inputsUsernameHelpers.setValue(fileJSON.client_email || '');
                inputsProjectHelpers.setValue(fileJSON.project_id || '');
                inputsSSHKeyDataHelpers.setValue(fileJSON.private_key || '');
                setFileError(null);
              }
            } catch {
              setFileError(
                t`There was an error parsing the file. Please check the file formatting and try again.`
              );
            }
          } else {
            setFile('');
            setFilename('');
            inputsUsernameHelpers.setValue('');
            inputsProjectHelpers.setValue('');
            inputsSSHKeyDataHelpers.setValue('');
            setFileError(null);
          }
        }}
        dropzoneProps={{
          accept: '.json',
          onDropRejected: () => {
            setFileError(
              t`File upload rejected. Please select a single .json file.`
            );
          },
        }}
      />
    </FormGroup>
  );
}

export default GceFileUploadField;
