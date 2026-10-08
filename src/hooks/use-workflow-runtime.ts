"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { showToast } from "@/helpers/toast";
import { toCanvasStatus } from "@/helpers/workflow-run";
import { useStartWorkflowRun } from "@/hooks/mutations/use-start-workflow-run";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useWorkflowRun } from "@/hooks/queries/use-workflow-run";
import { useWorkflowStore } from "@/stores/workflow";
import { uuid } from "@/utils/uuid";

export const useWorkflowRuntime = () => {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get("run");
  const { data: run, isError, refetch } = useWorkflowRun(runId);
  const { mutate: start, isPending: isStarting } = useStartWorkflowRun();
  const { mutate: action, isPending: isActing } = useWorkflowRunAction();
  const workflowId = useWorkflowStore(state => state.workflowId);
  useEffect(() => {
    if (!run || run.workflowId !== workflowId) return;
    useWorkflowStore.setState(state => ({ isRunning: !["completed", "cancelled", "failed"].includes(run.status), nodes: state.nodes.map(node => {
      const step = run.nodes.find(n => n.nodeId === node.id);
      return step ? { ...node, data: { ...node.data, status: toCanvasStatus(step.status), stage: step.stage, progress: step.progress } } : node;
    }) }));
  }, [run, workflowId]);
  const startRun = () => {
    const state = useWorkflowStore.getState();
    if (!state.workflowId) return;
    if (state.isDirty) { showToast("warning", "Save your configuration before running."); return; }
    start({ workflowId: state.workflowId, revision: state.revision, key: uuid() }, { onSuccess: result => router.replace(`/workflows?id=${result.workflowId}&run=${result.id}`, { scroll: false }) });
  };
  const cancelRun = () => { if (run) action({ runId: run.id, expectedRevision: run.revision, action: "cancel" }); };
  return { run: run?.workflowId === workflowId ? run : undefined, runId, isRunning: Boolean(run && run.workflowId === workflowId && !["completed", "cancelled", "failed"].includes(run.status)), isPending: isStarting || isActing, isError, refetch, startRun, cancelRun };
};
