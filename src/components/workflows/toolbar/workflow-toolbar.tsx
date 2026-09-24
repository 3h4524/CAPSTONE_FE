"use client";

import { useState } from "react";
import { Play, Save, ShieldCheck, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditorPanelSheets } from "@/components/workflows/toolbar/editor-panel-sheets";
import { WorkflowActionsMenu } from "@/components/workflows/toolbar/workflow-actions-menu";
import { WorkflowMetaDialog } from "@/components/workflows/toolbar/workflow-meta-dialog";
import { WorkflowSwitcher } from "@/components/workflows/toolbar/workflow-switcher";
import { NEW_WORKFLOW_NAME, STARTER_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { showToast } from "@/helpers/toast";
import { getCopyName, toWorkflowDefinition, validateWorkflow } from "@/helpers/workflow-graph";
import { useCreateWorkflow } from "@/hooks/mutations/use-create-workflow";
import { useDeleteWorkflow } from "@/hooks/mutations/use-delete-workflow";
import { useUpdateWorkflow } from "@/hooks/mutations/use-update-workflow";
import { useWorkflowRunSimulation } from "@/hooks/use-workflow-run-simulation";
import type { WorkflowMetaFormValues } from "@/schemas/workflow";
import { usePopupStore } from "@/stores/popup";
import { useWorkflowStore } from "@/stores/workflow";
import type { SaveWorkflowInput, WorkflowSummary } from "@/types/workflow";
import { useReactFlow } from "@xyflow/react";

type MetaDialogMode = "create" | "rename";

type WorkflowToolbarProps = {
  workflows: WorkflowSummary[];
  activeWorkflowId: string | null;
  isEditorReady: boolean;
  onOpenWorkflow: (id: string | null) => void;
  guardUnsavedChanges: (action: () => void) => void;
};

export const WorkflowToolbar = ({
  workflows,
  activeWorkflowId,
  isEditorReady,
  onOpenWorkflow,
  guardUnsavedChanges,
}: WorkflowToolbarProps) => {
  const [metaDialogMode, setMetaDialogMode] = useState<MetaDialogMode | null>(null);
  const { getViewport } = useReactFlow();
  const openPopup = usePopupStore((state) => state.openPopup);
  const name = useWorkflowStore((state) => state.name);
  const description = useWorkflowStore((state) => state.description);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const markSaved = useWorkflowStore((state) => state.markSaved);
  const { mutate: createWorkflow, isPending: isCreating } = useCreateWorkflow();
  const { mutate: updateWorkflow, isPending: isSaving } = useUpdateWorkflow();
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow();
  const { isRunning, start: startRun, cancel: cancelRun } = useWorkflowRunSimulation();

  const isBusy = !isEditorReady || isRunning || isCreating || isSaving || isDeleting;

  const buildCurrentInput = (meta?: WorkflowMetaFormValues): SaveWorkflowInput => {
    const { nodes, edges } = useWorkflowStore.getState();
    return {
      name: meta?.name ?? name,
      description: meta?.description ?? description,
      definition: toWorkflowDefinition(nodes, edges, getViewport()),
    };
  };

  const saveWorkflow = (meta?: WorkflowMetaFormValues) => {
    if (!activeWorkflowId) return;
    updateWorkflow(
      { id: activeWorkflowId, input: buildCurrentInput(meta) },
      {
        onSuccess: (saved) => {
          markSaved(saved);
          setMetaDialogMode(null);
          showToast("success", `${saved.name} was saved.`);
        },
      }
    );
  };

  const validateCurrentWorkflow = () => {
    const { nodes, edges } = useWorkflowStore.getState();
    const issueCount = validateWorkflow(nodes, edges).length;
    selectNode(null);
    if (issueCount === 0) showToast("success", "The workflow is valid and ready to run.");
    else showToast("warning", `Found ${issueCount} issue${issueCount > 1 ? "s" : ""}. Review them in the side panel.`);
  };

  const submitMeta = (values: WorkflowMetaFormValues) => {
    if (metaDialogMode === "rename") {
      saveWorkflow(values);
      return;
    }
    createWorkflow(
      { ...values, definition: STARTER_WORKFLOW_DEFINITION },
      {
        onSuccess: (created) => {
          setMetaDialogMode(null);
          onOpenWorkflow(created.id);
          showToast("success", `${created.name} was created.`);
        },
      }
    );
  };

  const duplicateWorkflow = () => {
    const input = buildCurrentInput();
    const copyName = getCopyName(name, workflows.map((item) => item.name));
    createWorkflow(
      { ...input, name: copyName },
      {
        onSuccess: (created) => {
          onOpenWorkflow(created.id);
          showToast("success", `${created.name} was created from your current canvas.`);
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!activeWorkflowId) return;
    openPopup({
      title: `Delete ${name}?`,
      description: "This removes the workflow and its canvas permanently.",
      positiveLabel: "Delete",
      onPositive: () =>
        deleteWorkflow(activeWorkflowId, {
          onSuccess: () => {
            const nextWorkflow = workflows.find((item) => item.id !== activeWorkflowId);
            onOpenWorkflow(nextWorkflow?.id ?? null);
            showToast("success", `${name} was deleted.`);
          },
        }),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
      <EditorPanelSheets />
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
        <Button type="button" variant="ghost" size="sm" className="px-3" onClick={validateCurrentWorkflow} disabled={isBusy}>
          <ShieldCheck aria-hidden="true" />
          <span className="hidden sm:inline">Validate</span>
        </Button>
        {isRunning ? (
          <Button type="button" variant="outline" size="sm" className="px-3" onClick={cancelRun}>
            <Square aria-hidden="true" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="px-3" onClick={startRun} disabled={isBusy}>
            <Play aria-hidden="true" />
            <span className="hidden sm:inline">Run demo</span>
          </Button>
        )}
        <Button type="button" size="sm" className="px-4" onClick={() => saveWorkflow()} disabled={isBusy || !isDirty}>
          <Save aria-hidden="true" />
          <span className="hidden sm:inline">Save</span>
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
          defaultValues={metaDialogMode === "rename" ? { name, description } : { name: NEW_WORKFLOW_NAME, description: "" }}
          isPending={isCreating || isSaving}
          onClose={() => setMetaDialogMode(null)}
          onSubmit={submitMeta}
        />
      )}
    </div>
  );
};
