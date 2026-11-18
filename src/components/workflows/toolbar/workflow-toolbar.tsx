"use client";

import { useState } from "react";
import { Play, Redo2, Save, ShieldCheck, Square, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GuideReplayButton } from "@/components/commons/onboarding/guide-replay-button";
import { Button } from "@/components/ui/button";
import { EditorPanelSheets } from "@/components/workflows/toolbar/editor-panel-sheets";
import { WorkflowActionsMenu } from "@/components/workflows/toolbar/workflow-actions-menu";
import { WorkflowBackButton } from "@/components/workflows/toolbar/workflow-back-button";
import { WorkflowMetaDialog } from "@/components/workflows/toolbar/workflow-meta-dialog";
import { WorkflowSwitcher } from "@/components/workflows/toolbar/workflow-switcher";
import { NEW_WORKFLOW_NAME, STARTER_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { showToast, showWorkflowActionToast } from "@/helpers/toast";
import { getCopyName, validateWorkflow } from "@/helpers/workflow-graph";
import { useCreateWorkflow } from "@/hooks/mutations/use-create-workflow";
import { useDeleteWorkflow } from "@/hooks/mutations/use-delete-workflow";
import { useWorkflowCommands } from "@/hooks/use-workflow-commands";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { useWorkflowSave } from "@/hooks/use-workflow-save";
import type { WorkflowMetaFormValues } from "@/schemas/workflow";
import { usePopupStore } from "@/stores/popup";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowSummary } from "@/types/workflow";

type MetaDialogMode = "create" | "rename";

type WorkflowToolbarProps = {
  workflows: WorkflowSummary[];
  activeWorkflowId: string | null;
  isEditorReady: boolean;
  onOpenWorkflow: (id: string | null) => void;
  guardUnsavedChanges: (action: () => void) => void;
  /** Off on the phone's step list, which has no canvas to add nodes to. */
  showsPanelButtons?: boolean;
};

export const WorkflowToolbar = ({
  workflows,
  activeWorkflowId,
  isEditorReady,
  onOpenWorkflow,
  guardUnsavedChanges,
  showsPanelButtons = true,
}: WorkflowToolbarProps) => {
  const [metaDialogMode, setMetaDialogMode] = useState<MetaDialogMode | null>(null);
  const openPopup = usePopupStore((state) => state.openPopup);
  const name = useWorkflowStore((state) => state.name);
  const description = useWorkflowStore((state) => state.description);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const canUndo = useWorkflowStore((state) => state.past.length > 0);
  const canRedo = useWorkflowStore((state) => state.future.length > 0);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const { saveWorkflow, buildSaveInput, isSaving } = useWorkflowSave();
  const { mutate: createWorkflow, isPending: isCreating } = useCreateWorkflow();
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow();
  const {
    isRunning,
    start: startRun,
    cancel: cancelRun,
    continueRun,
    isPending: isRunPending,
  } = useWorkflowExecution(activeWorkflowId, isEditorReady);

  const { t } = useTranslation("common");
  const isBusy =
    !isEditorReady || isRunning || isCreating || isSaving || isDeleting || isRunPending;

  useWorkflowCommands(activeWorkflowId, isEditorReady, isBusy, {
    save: (options) => saveWorkflow(undefined, options),
    run: () => void startRun(),
    continueRun: (command) => void continueRun(command),
  });

  const validateCurrentWorkflow = () => {
    const { nodes, edges } = useWorkflowStore.getState();
    const issueCount = validateWorkflow(nodes, edges).length;
    selectNode(null);
    if (issueCount === 0) showWorkflowActionToast("success", t("workflowEditor.toolbar.valid"));
    else
      showWorkflowActionToast(
        "warning",
        t("workflowEditor.toolbar.issuesFound", { count: issueCount })
      );
  };

  const submitMeta = (values: WorkflowMetaFormValues) => {
    if (metaDialogMode === "rename") {
      saveWorkflow(values, { onSaved: () => setMetaDialogMode(null) });
      return;
    }
    createWorkflow(
      { ...values, definition: STARTER_WORKFLOW_DEFINITION },
      {
        onSuccess: (created) => {
          setMetaDialogMode(null);
          onOpenWorkflow(created.id);
          showToast("success", t("workflowEditor.toolbar.created", { name: created.name }));
        },
      }
    );
  };

  const duplicateWorkflow = () => {
    const input = buildSaveInput();
    const copyName = getCopyName(
      name,
      workflows.map((item) => item.name)
    );
    createWorkflow(
      { ...input, name: copyName },
      {
        onSuccess: (created) => {
          onOpenWorkflow(created.id);
          showToast("success", t("workflowEditor.toolbar.duplicated", { name: created.name }));
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!activeWorkflowId) return;
    openPopup({
      title: t("workflowEditor.toolbar.deleteTitle", { name }),
      description: t("workflowEditor.toolbar.deleteDescription"),
      positiveLabel: t("workflowEditor.toolbar.delete"),
      onPositive: () =>
        deleteWorkflow(
          { id: activeWorkflowId, revision: useWorkflowStore.getState().revision },
          {
            onSuccess: () => {
              const nextWorkflow = workflows.find((item) => item.id !== activeWorkflowId);
              onOpenWorkflow(nextWorkflow?.id ?? null);
              showToast("success", t("workflowEditor.toolbar.deleted", { name }));
            },
          }
        ),
    });
  };

  return (
    <div data-guide="workflows.toolbar" className="bg-card flex flex-wrap items-center gap-2 border-b px-3 py-2 max-sm:gap-1 max-sm:px-2">
      <WorkflowBackButton guardUnsavedChanges={guardUnsavedChanges} />
      {showsPanelButtons && <EditorPanelSheets />}
      <WorkflowSwitcher
        workflows={workflows}
        activeWorkflowId={activeWorkflowId}
        name={name}
        isDirty={isDirty}
        disabled={isBusy}
        onSelect={(id) => guardUnsavedChanges(() => onOpenWorkflow(id))}
        onCreate={() => guardUnsavedChanges(() => setMetaDialogMode("create"))}
      />
      <div className="ml-auto flex items-center gap-2">
        <GuideReplayButton guideKey="workflows" iconOnly className="hidden lg:inline-flex" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("workflowEditor.toolbar.undo")}
          title={t("workflowEditor.toolbar.undo")}
          onClick={undo}
          disabled={isBusy || !canUndo}
        >
          <Undo2 aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("workflowEditor.toolbar.redo")}
          title={t("workflowEditor.toolbar.redo")}
          onClick={redo}
          disabled={isBusy || !canRedo}
        >
          <Redo2 aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-3"
          onClick={validateCurrentWorkflow}
          disabled={isBusy}
        >
          <ShieldCheck aria-hidden="true" />
          <span className="hidden sm:inline">{t("workflowEditor.toolbar.validate")}</span>
        </Button>
        {isRunning ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-3"
            onClick={() => void cancelRun()}
          >
            <Square aria-hidden="true" />
            <span className="hidden sm:inline">{t("workflowEditor.toolbar.stop")}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-3"
            onClick={() => void startRun()}
            disabled={isBusy}
          >
            <Play aria-hidden="true" />
            <span className="hidden sm:inline">{t("workflowEditor.toolbar.run")}</span>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="px-4"
          onClick={() => saveWorkflow()}
          disabled={
            !isEditorReady || isCreating || isSaving || isDeleting || isRunPending || !isDirty
          }
        >
          <Save aria-hidden="true" />
          <span className="hidden sm:inline">{t("workflowEditor.toolbar.save")}</span>
        </Button>
        <WorkflowActionsMenu
          disabled={isBusy}
          onRename={() => setMetaDialogMode("rename")}
          onDuplicate={duplicateWorkflow}
          onDelete={confirmDelete}
        />
      </div>
      {metaDialogMode && (
        <WorkflowMetaDialog
          mode={metaDialogMode}
          defaultValues={
            metaDialogMode === "rename"
              ? { name, description }
              : { name: NEW_WORKFLOW_NAME, description: "" }
          }
          isPending={isCreating || isSaving}
          onClose={() => setMetaDialogMode(null)}
          onSubmit={submitMeta}
        />
      )}
    </div>
  );
};
