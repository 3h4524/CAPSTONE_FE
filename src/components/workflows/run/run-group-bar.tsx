"use client";

import { useEffect } from "react";

import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";

// Draws nothing: it keeps the canvas in step with the batch video run that is open. The videos of the run are chosen
// on the Generate Video node, so no bar is shown above the canvas.
export const RunGroupBar = () => {
  const groupId = useRunGroupId();
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const { data: group } = useRunGroup(groupId);
  const { runId, closeRun } = useWorkflowRuntime();
  const hasScope = useWorkflowStore((state) => Boolean(state.designScope));
  const following = Boolean(group && group.workflowId === workflowId);
  // A design's settings are shown only while its run group is open: closing it puts the shared settings back.
  useEffect(() => {
    if (hasScope && !following && (!groupId || group)) useWorkflowStore.getState().leaveDesignScope();
  }, [hasScope, following, groupId, group]);
  // The canvas may still follow a run from before this group opened (restored as the workflow's latest run, or one
  // of an earlier group): its steps and its design are not this group's, so the canvas stops following it.
  const foreignRun = Boolean(group && following && runId && !group.targets.some((target) => target.runId === runId));
  useEffect(() => {
    if (foreignRun) closeRun();
    // closeRun is rebuilt every render; only the run being foreign matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreignRun]);
  return null;
};
