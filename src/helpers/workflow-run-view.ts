import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { isRunnableNode } from "@/helpers/workflow-run";
import type { WorkflowNode, WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";
import type { Rect } from "@xyflow/react";

const ATTENTION_STATUSES: WorkflowNodeStatus[] = ["waiting_for_input", "waiting_for_review", "failed"];

const FINISHED_STATUSES: WorkflowNodeStatus[] = ["success", "skipped"];

const PREVIEW_NODE_TYPES: WorkflowNodeType[] = ["design-image", "generate-listing"];

export type RunHudPhase = "running" | "attention" | "failed" | "done";

export type RunHudSummary = {
  phase: RunHudPhase;
  current: number;
  total: number;
  percent: number;
  names: string[];
};

export const hasRunPreview = (type: WorkflowNodeType) => PREVIEW_NODE_TYPES.includes(type);

export const getRunFocusIds = (nodes: WorkflowNode[], busyNodeIds: string[] = []) => {
  const active = nodes
    .filter((node) => node.data.status === "running" || busyNodeIds.includes(node.id))
    .map((node) => node.id);
  if (active.length > 0) return active;
  return nodes.filter((node) => ATTENTION_STATUSES.includes(node.data.status)).map((node) => node.id);
};

export const widenForPreviews = (bounds: Rect, nodes: WorkflowNode[]): Rect => {
  const hasPreview = nodes.some((node) => hasRunPreview(node.data.type));
  return hasPreview ? { ...bounds, width: bounds.width + RUN_PREVIEW_GAP + RUN_PREVIEW_WIDTH } : bounds;
};

export const summarizeRun = (nodes: WorkflowNode[]): RunHudSummary | null => {
  const steps = nodes.filter((node) => isRunnableNode(node.data.type));
  if (steps.length === 0) return null;
  const finished = steps.filter((node) => FINISHED_STATUSES.includes(node.data.status));
  const failed = steps.filter((node) => node.data.status === "failed");
  const waiting = steps.filter(
    (node) => node.data.status === "waiting_for_input" || node.data.status === "waiting_for_review"
  );
  const running = steps.filter((node) => node.data.status === "running");
  const progressTotal = steps.reduce((sum, node) => {
    if (FINISHED_STATUSES.includes(node.data.status)) return sum + 100;
    if (node.data.status === "running") return sum + Math.max(0, Math.min(100, node.data.progress ?? 0));
    return sum;
  }, 0);
  const phase: RunHudPhase =
    failed.length > 0
      ? "failed"
      : waiting.length > 0
        ? "attention"
        : finished.length === steps.length
          ? "done"
          : "running";
  const named = phase === "failed" ? failed : phase === "attention" ? waiting : running;
  return {
    phase,
    current: Math.min(steps.length, finished.length + 1),
    total: steps.length,
    percent: phase === "done" ? 100 : Math.round(progressTotal / steps.length),
    names: named.map((node) => node.data.label),
  };
};

export const withLiveListing = (nodes: WorkflowNode[], listingLive: boolean) =>
  listingLive
    ? nodes.map((node) =>
        node.data.type === "generate-listing" && node.data.status === "idle"
          ? { ...node, data: { ...node.data, status: "running" as const } }
          : node
      )
    : nodes;

export const centerOf = (points: { x: number; y: number }[]) =>
  points.length === 0
    ? null
    : {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      };

export const approachViewport = (
  current: { x: number; y: number; zoom: number },
  focus: { x: number; y: number },
  size: { width: number; height: number },
  zoom: number,
  smoothing: number
) => {
  const nextZoom = current.zoom + (zoom - current.zoom) * smoothing;
  const targetX = size.width / 2 - focus.x * nextZoom;
  const targetY = size.height / 2 - focus.y * nextZoom;
  return {
    x: current.x + (targetX - current.x) * smoothing,
    y: current.y + (targetY - current.y) * smoothing,
    zoom: nextZoom,
  };
};
