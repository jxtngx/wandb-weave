import {useLazyQuery, useMutation} from '@apollo/client';
import {coreAppUrl} from '@wandb/weave/config';
import * as Urls from '@wandb/weave/core/_external/util/urls';
import {opRootViewer} from '@wandb/weave/core';
import {UpsertReportMutationVariables} from '@wandb/weave/generated/graphql';
import {useNodeValue} from '@wandb/weave/react';
import React, {useMemo, useState} from 'react';
import _ from 'lodash';

import {Alert} from '../../Alert.styles';
import {Button} from '../../Button';
import {ChildPanelFullConfig} from '../ChildPanel';
import {Tailwind} from '../../Tailwind';
import {useCloseDrawer, useSelectedPath} from '../PanelInteractContext';
import {AddPanelErrorAlert} from './AddPanelErrorAlert';
import {ReportSelection} from './ReportSelection';
import {computeReportSlateNode} from './computeReportSlateNode';
import {GET_REPORT, UPSERT_REPORT} from './graphql';
import {
  EntityOption,
  ProjectOption,
  ReportOption,
  editDraftVariables,
  getReportDraftByUser,
  isNewReportOption,
  newDraftVariables,
  newReportVariables,
} from './utils';

type ChildPanelExportReportProps = {
  /**
   * "root" config of the board, which points to the artifact that contains
   * the "full" config with actual details about all the sub-panels within
   */
  rootConfig: ChildPanelFullConfig;
};

export const ChildPanelExportReport = ({
  rootConfig,
}: ChildPanelExportReportProps) => {
  const {result: viewer} = useNodeValue(opRootViewer({}));
  const {result: fullConfig} = useNodeValue(rootConfig.input_node);
  const selectedPath = useSelectedPath();
  const closeDrawer = useCloseDrawer();

  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(
    null
  );
  const [selectedReport, setSelectedReport] = useState<ReportOption | null>(
    null
  );
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(
    null
  );

  const [getReport] = useLazyQuery(GET_REPORT);
  const [upsertReport] = useMutation(UPSERT_REPORT);
  const [isAddingPanel, setIsAddingPanel] = useState(false);
  const [error, setError] = useState<any>(null);

  const slateNode = useMemo(
    () =>
      fullConfig && selectedPath
        ? computeReportSlateNode(fullConfig, selectedPath)
        : undefined,
    [fullConfig, selectedPath]
  );

  const isNewReportSelected = isNewReportOption(selectedReport);
  const hasRequiredData =
    slateNode != null &&
    selectedEntity != null &&
    selectedReport != null &&
    selectedProject != null;
  const isAddPanelDisabled = !hasRequiredData || isAddingPanel;

  const handleError = (err: any) => {
    console.error(err);
    setError(err);
    setIsAddingPanel(false);
  };

  const submit = async (variables: UpsertReportMutationVariables) => {
    if (!hasRequiredData) {
      return;
    }
    const result = await upsertReport({variables});
    const upsertedDraft = result.data?.upsertView?.view!;
    const reportDraftPath = Urls.reportEdit({
      entityName: selectedEntity.name,
      projectName: selectedProject.name,
      reportID: upsertedDraft.id,
      reportName: upsertedDraft.displayName ?? '',
    });
    // eslint-disable-next-line wandb/no-unprefixed-urls
    window.open(coreAppUrl(reportDraftPath), '_blank');
    setIsAddingPanel(false);
    closeDrawer();
  };

  const onAddPanel = async () => {
    if (isAddPanelDisabled) {
      return;
    }
    try {
      setIsAddingPanel(true);
      if (isNewReportSelected) {
        return submit(
          newReportVariables(
            selectedEntity.name,
            selectedProject.name,
            slateNode
          )
        );
      }
      const {data} = await getReport({
        variables: {id: selectedReport.id!},
        fetchPolicy: 'no-cache',
      });
      const report = data?.view;
      if (!report) {
        throw new Error('Report not found');
      }
      const draft = getReportDraftByUser(report, viewer.id);
      if (draft) {
        return submit(editDraftVariables(draft, slateNode));
      } else {
        return submit(newDraftVariables(report, slateNode));
      }
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <Tailwind style={{height: '100%'}}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-moon-250 px-16 py-12">
          <h2 className="text-lg font-semibold">
            Add {_.last(selectedPath)} to report
          </h2>
          <Button icon="close" variant="ghost" onClick={closeDrawer} />
        </div>
        <div className="flex-1 gap-8 p-16">
          <Alert severity="warning">
            <p>
              <b>🚧 Work in progress!</b> This feature is under development
              behind an internal-only feature flag.
            </p>
          </Alert>
          <ReportSelection
            rootConfig={rootConfig}
            selectedEntity={selectedEntity}
            selectedReport={selectedReport}
            selectedProject={selectedProject}
            setSelectedEntity={setSelectedEntity}
            setSelectedReport={setSelectedReport}
            setSelectedProject={setSelectedProject}
            onChange={() => setError(null)}
          />
          {!error ? (
            <p className="mt-16 text-moon-500">
              Future changes to the board will not affect exported panels inside
              reports.
            </p>
          ) : (
            <AddPanelErrorAlert
              error={error}
              isNewReport={isNewReportSelected}
            />
          )}
        </div>
        <div className="border-t border-moon-250 px-16 py-20">
          <Button
            icon="add-new"
            className="w-full"
            disabled={isAddPanelDisabled}
            onClick={onAddPanel}>
            Add panel
          </Button>
        </div>
      </div>
    </Tailwind>
  );
};
