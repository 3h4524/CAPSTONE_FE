"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Workflow } from "lucide-react";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { WorkflowCanvas } from "@/components/workflows/canvas/workflow-canvas";
import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { NodePalette } from "@/components/workflows/palette/node-palette";
import { ResizableAside } from "@/components/workflows/resizable-aside";
import { WorkflowToolbar } from "@/components/workflows/toolbar/workflow-toolbar";
import { SITE_CONFIG } from "@/constants/site";
import { DEFAULT_WORKFLOW_DEFINITION, DEFAULT_WORKFLOW_NAME } from "@/constants/workflow";
import { showToast } from "@/helpers/toast";
import { applyCompactDefaultLayoutIfStillVertical, resolveActiveWorkflowId } from "@/helpers/workflow-graph";
import { useCreateWorkflow } from "@/hooks/mutations/use-create-workflow";
import { useLatestWorkflowRun } from "@/hooks/queries/use-latest-workflow-run";
import { useWorkflow } from "@/hooks/queries/use-workflow";
import { useWorkflows } from "@/hooks/queries/use-workflows";
import { useAssistantStore } from "@/stores/assistant";
import { usePopupStore } from "@/stores/popup";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";

const DEFAULT_WORKFLOW_DESCRIPTION =
  "A batch → designs → design approval → mock-ups → mock-up approval → Standard video → video review → ZIP.";

export const WorkflowWorkspace = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const hasAutoCreatedRef = useRef(false);
  const restoredRunForWorkflow = useRef<string | null>(null);
  const openPopup = usePopupStore((state) => state.openPopup);
  const loadedWorkflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.name);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const hasSelectedNode = useWorkflowStore((state) => state.selectedNodeIds.length > 0);
  const isAssistantOpen = useAssistantStore((state) => state.isOpen && state.displayMode === "panel");
  const assistantWidth = useAssistantStore((state) => state.panelWidth);
  const showNodePanel = hasSelectedNode || !isAssistantOpen;
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const resetEditor = useWorkflowStore((state) => state.reset);
  const productId = useWorkflowStore((state) => {
    const input = state.nodes.find((node) => node.data.type === "product-input");
    return typeof input?.data.config.productId === "string" ? input.data.config.productId : "";
  });
  const resetProductDependentState = useWorkflowStore((state) => state.resetProductDependentState);
  const previousProductId = useRef(productId);

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
  const { data: latestRun } = useLatestWorkflowRun(activeWorkflowId);

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
    if (workflow && workflow.id !== loadedWorkflowId) loadWorkflow(applyCompactDefaultLayoutIfStillVertical(workflow));
  }, [workflow, loadedWorkflowId, loadWorkflow]);

  useEffect(() => {
    if (!workflow || workflow.id !== loadedWorkflowId || latestRun === undefined || restoredRunForWorkflow.current === workflow.id) return;
    restoredRunForWorkflow.current = workflow.id;
    const state = useWorkflowStore.getState();
    if (!searchParams.get("run") && !state.videoRunId && latestRun?.workflowId === workflow.id) state.setVideoRunId(latestRun.id);
  }, [workflow, loadedWorkflowId, latestRun, searchParams]);

  useEffect(() => {
    if (previousProductId.current === productId) return;
    const changedFromAnotherProduct = Boolean(previousProductId.current) && previousProductId.current !== productId;
    previousProductId.current = productId;
    if (!changedFromAnotherProduct) return;

    const params = new URLSearchParams(window.location.search);
    // A product the open job made designs for keeps that job on the canvas: only what was chosen for the
    // video belongs to the product before.
    if (useWorkflowRunStore.getState().job?.products.some((product) => product.productId === productId)) {
      useWorkflowStore.setState((state) => ({
        nodes: state.nodes.map((node) => node.data.type === "apply-mockup"
          ? { ...node, data: { ...node.data, config: { ...node.data.config, mockupIds: [], artworkGroupKey: "" } } }
          : node),
        videoRunId: null,
      }));
    } else {
      // Designs and mock-ups belong to the product that started the run.
      useWorkflowRunStore.getState().reset();
      resetProductDependentState();
      params.delete("job");
    }
    params.delete("then");
    // The store forgets the video run too, but the URL would still bring it back.
    params.delete("run");
    const query = params.toString();
    router.replace(query ? `/workflows?${query}` : "/workflows", { scroll: false });
  }, [productId, resetProductDependentState, router]);

  useEffect(() => {
    if (workflows && workflows.length === 0 && loadedWorkflowId) resetEditor();
  }, [workflows, loadedWorkflowId, resetEditor]);

  const titleName = activeWorkflowId ? workflowName : "";

  useEffect(() => {
    const desiredTitle = titleName ? `${titleName} | ${SITE_CONFIG.name}` : `Workflows | ${SITE_CONFIG.name}`;
    document.title = desiredTitle;
    const observer = new MutationObserver(() => {
      if (document.title !== desiredTitle) document.title = desiredTitle;
    });
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [titleName]);

  useEffect(() => () => resetEditor(), [resetEditor]);

  // /workflows?batch=<id> (from the Batches page) points the Product input at that batch, once.
  const requestedBatchId = searchParams.get("batch");
  const appliedBatchRef = useRef<string | null>(null);
  const isEditorLoaded = workflow !== undefined && workflow.id === loadedWorkflowId;
  useEffect(() => {
    if (!requestedBatchId || !isEditorLoaded || appliedBatchRef.current === requestedBatchId) return;
    appliedBatchRef.current = requestedBatchId;
    const { nodes, updateNodeConfig } = useWorkflowStore.getState();
    const input = nodes.find((node) => node.data.type === "product-input");
    if (input) updateNodeConfig(input.id, { ...input.data.config, batchId: requestedBatchId });
    const params = new URLSearchParams(window.location.search);
    params.delete("batch");
    const query = params.toString();
    router.replace(query ? `/workflows?${query}` : "/workflows");
  }, [requestedBatchId, isEditorLoaded, router]);

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
    <div
      className="flex min-h-[560px] flex-1 flex-col xl:pr-(--assistant-inset)"
      style={{ "--assistant-inset": isAssistantOpen ? `${assistantWidth}px` : "0px" } as CSSProperties}
    >
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
        <div className="relative min-w-0 flex-1 bg-slate-100/70">
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
        {showNodePanel ? (
          <ResizableAside
            label="the node panel"
            storageKey="apcs.workflows.panel-width"
            defaultWidth={320}
            minWidth={288}
            maxWidth={760}
            reservedWidth={640}
          >
            <NodeConfigPanel />
          </ResizableAside>
        ) : null}
      </div>
    </div>
  );
};
