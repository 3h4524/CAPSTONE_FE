"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Workflow } from "lucide-react";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { WorkflowCanvas } from "@/components/workflows/canvas/workflow-canvas";
import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { NodePalette } from "@/components/workflows/palette/node-palette";
import { WorkflowToolbar } from "@/components/workflows/toolbar/workflow-toolbar";
import { DEFAULT_WORKFLOW_DEFINITION, DEFAULT_WORKFLOW_NAME } from "@/constants/workflow";
import { showToast } from "@/helpers/toast";
import { resolveActiveWorkflowId } from "@/helpers/workflow-graph";
import { useCreateWorkflow } from "@/hooks/mutations/use-create-workflow";
import { useWorkflow } from "@/hooks/queries/use-workflow";
import { useWorkflows } from "@/hooks/queries/use-workflows";
import { usePopupStore } from "@/stores/popup";
import { useWorkflowStore } from "@/stores/workflow";

const DEFAULT_WORKFLOW_DESCRIPTION =
  "Products flow through prompt synthesis, design generation, approval, mock-ups, video and listing content.";

export const WorkflowWorkspace = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const hasAutoCreatedRef = useRef(false);
  const openPopup = usePopupStore((state) => state.openPopup);
  const loadedWorkflowId = useWorkflowStore((state) => state.workflowId);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const resetEditor = useWorkflowStore((state) => state.reset);

  const {
    data: workflows,
    isPending: isLoadingWorkflows,
    isError: isWorkflowsError,
    refetch: refetchWorkflows,
  } = useWorkflows();
  const { mutate: createWorkflow, isPending: isCreatingWorkflow } = useCreateWorkflow();
  const activeWorkflowId = workflows ? resolveActiveWorkflowId(workflows, requestedId) : null;
  const {
    data: workflow,
    isError: isWorkflowError,
    refetch: refetchWorkflow,
  } = useWorkflow(activeWorkflowId);

  const createDefaultWorkflow = () =>
    createWorkflow(
      { name: DEFAULT_WORKFLOW_NAME, description: DEFAULT_WORKFLOW_DESCRIPTION, definition: DEFAULT_WORKFLOW_DEFINITION },
      { onSuccess: (created) => showToast("success", `${created.name} is ready to customize.`) }
    );

  useEffect(() => {
    if (!workflows || workflows.length > 0 || hasAutoCreatedRef.current) return;
    hasAutoCreatedRef.current = true;
    createDefaultWorkflow();
  });

  useEffect(() => {
    if (workflow && workflow.id !== loadedWorkflowId) loadWorkflow(workflow);
  }, [workflow, loadedWorkflowId, loadWorkflow]);

  useEffect(() => () => resetEditor(), [resetEditor]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const openWorkflow = (id: string | null) => router.replace(id ? `/workflows?id=${id}` : "/workflows");

  const guardUnsavedChanges = (action: () => void) => {
    if (!useWorkflowStore.getState().isDirty) {
      action();
      return;
    }
    openPopup({
      title: "Discard unsaved changes?",
      description: "Your latest edits to this workflow have not been saved yet.",
      positiveLabel: "Discard changes",
      negativeLabel: "Keep editing",
      onPositive: action,
    });
  };

  if (isLoadingWorkflows) return <PageLoading label="Loading workflows" />;

  if (isWorkflowsError || !workflows) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <Workflow className="size-8 text-slate-400" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-900">Workflows unavailable</p>
          <p className="text-muted-foreground mt-1 text-sm">We could not load your workflows. Try again in a moment.</p>
        </div>
        <Button type="button" onClick={() => refetchWorkflows()}>Try again</Button>
      </div>
    );
  }

  if (workflows.length === 0) {
    return isCreatingWorkflow ? (
      <SectionLoading label="Preparing your first workflow" className="flex-1" />
    ) : (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Workflow className="size-8 text-slate-400" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-900">No workflows yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Start from the standard Etsy POD pipeline and adapt it to your shop.</p>
        </div>
        <Button type="button" onClick={createDefaultWorkflow}>Create workflow</Button>
      </div>
    );
  }

  const isEditorReady = workflow !== undefined && workflow.id === loadedWorkflowId;

  return (
    <div className="flex h-[calc(100dvh-6.25rem)] min-h-[560px] flex-col lg:h-[calc(100dvh-7.25rem)]">
      <WorkflowToolbar
        workflows={workflows}
        activeWorkflowId={activeWorkflowId}
        isEditorReady={isEditorReady}
        onOpenWorkflow={openWorkflow}
        guardUnsavedChanges={guardUnsavedChanges}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r lg:block">
          <NodePalette />
        </aside>
        <div className="relative min-w-0 flex-1 bg-slate-50">
          {isEditorReady ? (
            <WorkflowCanvas />
          ) : isWorkflowError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
              <p className="font-semibold text-slate-900">This workflow could not be opened</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetchWorkflow()}>Try again</Button>
            </div>
          ) : (
            <SectionLoading label="Loading workflow" className="h-full" />
          )}
        </div>
        <aside className="hidden w-80 shrink-0 border-l xl:block">
          <NodeConfigPanel />
        </aside>
      </div>
    </div>
  );
};
