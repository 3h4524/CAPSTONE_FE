"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { showToast } from "@/helpers/toast";
import { isBatchRunNode, isVideoRunNode, toCanvasStatus } from "@/helpers/workflow-run";
import { useStartWorkflowRun } from "@/hooks/mutations/use-start-workflow-run";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useWorkflowRun } from "@/hooks/queries/use-workflow-run";
import { NEXT_PART_PARAM } from "@/hooks/use-batch-run";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeData } from "@/types/workflow";
import { uuid } from "@/utils/uuid";

/** The video run a reloaded page follows. (`job` in the same URL is the batch job the designs came from.) */
export const VIDEO_RUN_PARAM = "run";

const FINISHED_RUN_STATUSES = ["completed", "cancelled", "failed"];

// The server's run of the video steps: Mockup Approval, Generate Video, Review Video and Export ZIP.
export const useWorkflowRuntime = () => {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get(VIDEO_RUN_PARAM);
  const { data: run, isError, refetch } = useWorkflowRun(runId);
  const { mutate: start, isPending: isStarting } = useStartWorkflowRun();
  const { mutate: action, isPending: isActing } = useWorkflowRunAction();
  const workflowId = useWorkflowStore(state => state.workflowId);
  const startRun = () => {
    const state = useWorkflowStore.getState();
    if (!state.workflowId) return;
    if (state.isDirty) { showToast("warning", "Save your configuration before running."); return; }
    start({ workflowId: state.workflowId, revision: state.revision, key: uuid() }, { onSuccess: result => {
      // The other parameters stay: the batch job that made the designs is still open beside the new run.
      const query = new URLSearchParams(window.location.search);
      query.set("id", result.workflowId);
      query.set(VIDEO_RUN_PARAM, result.id);
      // The video part has started, so the note that it was still to come goes.
      query.delete(NEXT_PART_PARAM);
      router.replace(`/workflows?${query.toString()}`, { scroll: false });
    } });
  };
  const cancelRun = () => { if (run) action({ runId: run.id, expectedRevision: run.revision, action: "cancel" }); };
  // Leaves the run where it is on the server and stops following it, so the next one starts from clean steps.
  const closeRun = () => {
    const query = new URLSearchParams(window.location.search);
    if (!query.has(VIDEO_RUN_PARAM)) return;
    query.delete(VIDEO_RUN_PARAM);
    const rest = query.toString();
    router.replace(rest ? `/workflows?${rest}` : "/workflows", { scroll: false });
  };
  return { run: run?.workflowId === workflowId ? run : undefined, runId, isRunning: Boolean(run && run.workflowId === workflowId && !FINISHED_RUN_STATUSES.includes(run.status)), isPending: isStarting || isActing, isError, refetch, startRun, cancelRun, closeRun };
};

// Shows the open video run on the canvas. Mounted once, beside the hook that shows the batch job, so the two
// never write the same step: the video run owns the video steps, and the steps before them only while no batch
// job is open (the run records Product Input and Apply Mockup as done, and never touches the design steps).
export const useVideoRunSync = (hasBatchRun: boolean) => {
  const { run } = useWorkflowRuntime();
  // Changes when the canvas gets its nodes, so a run that loaded first is still shown.
  const nodeSignature = useWorkflowStore(state => state.nodes.map(node => `${node.id}:${node.data.type}`).join("|"));
  useEffect(() => {
    useWorkflowStore.setState(state => {
      let changed = false;
      const nodes = state.nodes.map(node => {
        const type = node.data.type;
        const step = run?.nodes.find(n => n.nodeId === node.id);
        let next: Pick<WorkflowNodeData, "status" | "stage" | "progress"> | null = null;
        if (isVideoRunNode(type)) next = step ? { status: toCanvasStatus(step.status), stage: step.stage, progress: step.progress } : { status: "idle", stage: null, progress: 0 };
        // Without a batch job these steps show what the video run recorded, and nothing once it is closed.
        else if (!hasBatchRun && isBatchRunNode(type)) next = { status: step ? toCanvasStatus(step.status) : "idle", stage: null, progress: 0 };
        if (!next || (next.status === node.data.status && (next.stage ?? null) === (node.data.stage ?? null) && (next.progress ?? 0) === (node.data.progress ?? 0))) return node;
        changed = true;
        return { ...node, data: { ...node.data, ...next } };
      });
      return changed ? { nodes } : state;
    });
  }, [run, hasBatchRun, nodeSignature]);
};
