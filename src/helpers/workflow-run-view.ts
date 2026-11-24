import {
  RUN_PREVIEW_GAP,
  RUN_PREVIEW_HEIGHT,
  RUN_PREVIEW_NODE_Z,
  RUN_PREVIEW_RUNNING_NODE_Z,
  RUN_PREVIEW_WIDTH,
} from "@/constants/workflow-run-effects";
import { isRunnableNode } from "@/helpers/workflow-run";
import type { WorkflowNode, WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";
import type { Rect } from "@xyflow/react";

export type PreviewTone = "live" | "done" | "failed";

const ATTENTION_STATUSES: WorkflowNodeStatus[] = ["waiting_for_input", "waiting_for_review", "failed"];

const FINISHED_STATUSES: WorkflowNodeStatus[] = ["success", "skipped"];

const PREVIEW_NODE_TYPES: WorkflowNodeType[] = [
  "design-image",
  "generate-listing",
  "apply-mockup",
  "generate-video",
  "publish-etsy",
  "publish-printify",
];

export type RunHudPhase = "running" | "attention" | "failed" | "done";

export type RunHudSummary = {
  phase: RunHudPhase;
  current: number;
  total: number;
  percent: number;
  names: string[];
};

export const hasRunPreview = (type: WorkflowNodeType) => PREVIEW_NODE_TYPES.includes(type);

export const previewToneOf = (status: WorkflowNodeStatus): PreviewTone =>
  status === "running" ? "live" : status === "failed" ? "failed" : "done";

const hostOf = (value: unknown) => {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
};

export const readPublishOutput = (output: Record<string, unknown> | undefined) => ({
  madeAs: typeof output?.madeAs === "string" ? output.madeAs : null,
  etsyHost: hostOf(output?.etsyUrl),
  mediaAttached: typeof output?.mediaAttached === "number" ? output.mediaAttached : 0,
  warnings: Array.isArray(output?.warnings)
    ? output.warnings.filter((item): item is string => typeof item === "string")
    : [],
});

export const getRunFocusIds = (nodes: WorkflowNode[], busyNodeIds: string[] = []) => {
  const active = nodes
    .filter((node) => node.data.status === "running" || busyNodeIds.includes(node.id))
    .map((node) => node.id);
  if (active.length > 0) return active;
  return nodes.filter((node) => ATTENTION_STATUSES.includes(node.data.status)).map((node) => node.id);
};

/** Where a run preview sits beside its node: on the right unless another node is there. */
export type RunPreviewSide = "right" | "left" | "bottom" | "top";

const PREVIEW_SIDES: RunPreviewSide[] = ["right", "left", "bottom", "top"];
const PREVIEW_SIZE = { width: RUN_PREVIEW_WIDTH, height: RUN_PREVIEW_HEIGHT };

export const nodeRect = (node: WorkflowNode): Rect => ({
  x: node.position.x,
  y: node.position.y,
  width: node.measured?.width ?? node.width ?? 0,
  height: node.measured?.height ?? node.height ?? 0,
});

/** The box a preview takes on `side` of a node: beside it top-aligned, or above or below it left-aligned. */
export const previewRect = (node: Rect, side: RunPreviewSide, size = PREVIEW_SIZE): Rect => {
  if (side === "right") return { x: node.x + node.width + RUN_PREVIEW_GAP, y: node.y, ...size };
  if (side === "left") return { x: node.x - RUN_PREVIEW_GAP - size.width, y: node.y, ...size };
  if (side === "bottom") return { x: node.x, y: node.y + node.height + RUN_PREVIEW_GAP, ...size };
  return { x: node.x, y: node.y - RUN_PREVIEW_GAP - size.height, ...size };
};

const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/**
 * The first side, right, left, below then above, where the preview covers no other node; when every side covers one,
 * the side that covers the least of them.
 */
export const choosePreviewSide = (node: Rect, others: Rect[], size = PREVIEW_SIZE): RunPreviewSide => {
  let best: RunPreviewSide = "right";
  let least = Number.POSITIVE_INFINITY;
  for (const side of PREVIEW_SIDES) {
    const box = previewRect(node, side, size);
    const covered = others.reduce((sum, other) => sum + overlap(box, other), 0);
    if (covered === 0) return side;
    if (covered < least) {
      least = covered;
      best = side;
    }
  }
  return best;
};

/** The side the preview of `node` goes on, away from the other nodes of the canvas. */
export const previewSideOf = (node: WorkflowNode, nodes: WorkflowNode[]): RunPreviewSide =>
  choosePreviewSide(
    nodeRect(node),
    nodes.filter((other) => other.id !== node.id).map(nodeRect)
  );

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/** `bounds` grown to hold the previews of `nodes`, each on the side it takes among `canvas` (all the nodes). */
export const widenForPreviews = (bounds: Rect, nodes: WorkflowNode[], canvas: WorkflowNode[] = nodes): Rect =>
  nodes
    .filter((node) => hasRunPreview(node.data.type))
    .reduce((rect, node) => union(rect, previewRect(nodeRect(node), previewSideOf(node, canvas))), bounds);

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

export const raisePreviewNodes = (nodes: WorkflowNode[], statusById: Map<string, WorkflowNodeStatus>) =>
  nodes.map((node) => {
    const status = statusById.get(node.id) ?? node.data.status;
    if (!hasRunPreview(node.data.type) || status === "idle") return node;
    return { ...node, zIndex: status === "running" ? RUN_PREVIEW_RUNNING_NODE_Z : RUN_PREVIEW_NODE_Z };
  });

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
