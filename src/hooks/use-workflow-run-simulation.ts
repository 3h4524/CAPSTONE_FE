"use client";

import { useEffect, useRef } from "react";

import { showToast } from "@/helpers/toast";
import { getExecutionOrder, validateWorkflow } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";

const randomStepDuration = () => 800 + Math.round(Math.random() * 700);

export const useWorkflowRunSimulation = () => {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const setNodeStatus = useWorkflowStore((state) => state.setNodeStatus);
  const resetStatuses = useWorkflowStore((state) => state.resetStatuses);
  const setRunning = useWorkflowStore((state) => state.setRunning);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    },
    []
  );

  const schedule = (delay: number, task: () => void) => {
    timersRef.current.push(setTimeout(task, delay));
  };

  const start = () => {
    const { nodes, edges } = useWorkflowStore.getState();
    const issues = validateWorkflow(nodes, edges);
    if (issues.length > 0) {
      showToast("error", `Fix ${issues.length} workflow issue${issues.length > 1 ? "s" : ""} before running.`);
      return;
    }

    clearTimers();
    resetStatuses();
    setRunning(true);

    let elapsed = 0;
    getExecutionOrder(nodes, edges).forEach((nodeId) => {
      schedule(elapsed, () => setNodeStatus(nodeId, "running"));
      elapsed += randomStepDuration();
      schedule(elapsed, () => setNodeStatus(nodeId, "success"));
    });
    schedule(elapsed, () => {
      setRunning(false);
      timersRef.current = [];
      showToast("success", "Demo run finished. Every step completed.");
    });
  };

  const cancel = () => {
    clearTimers();
    const { nodes } = useWorkflowStore.getState();
    nodes
      .filter((node) => node.data.status === "running" || node.data.status === "idle")
      .forEach((node) => setNodeStatus(node.id, "skipped"));
    setRunning(false);
    showToast("info", "Demo run stopped.");
  };

  return { isRunning, start, cancel, resetStatuses };
};
