import { RUN_ORDER } from "@/constants/workflow";
import {
  createWorkflowNode,
  getConnectionIssue,
  getExecutionOrder,
  withUniqueLabels,
} from "@/helpers/workflow-graph";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { addEdge } from "@xyflow/react";

// The phone edits a workflow as a list, so these keep the graph connected the way the canvas
// leaves that to the person: a step lands in its run order and a removed step's neighbours join up.

const NEW_STEP_OFFSET = { x: 0, y: 200 };

const runOrderOf = (node: WorkflowNode) => RUN_ORDER.indexOf(node.data.type);

const join = (source: string, target: string, edges: WorkflowEdge[], nodes: WorkflowNode[]) => {
  const connection = { source, target, sourceHandle: null, targetHandle: null };
  return getConnectionIssue(connection, edges, nodes) ? edges : addEdge(connection, edges);
};

/** Every step once, in run order; a step not connected yet keeps its place in the run order. */
export const orderSteps = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] => {
  const position = new Map(getExecutionOrder(nodes, edges).map((id, index) => [id, index]));
  const rank = (node: WorkflowNode) => {
    const order = runOrderOf(node);
    return order >= 0 ? order : RUN_ORDER.length;
  };
  return [...nodes].sort(
    (a, b) => rank(a) - rank(b) || (position.get(a.id) ?? nodes.length) - (position.get(b.id) ?? nodes.length)
  );
};

/** The kinds of step a workflow can still take: each step of a run appears once. */
export const getAddableStepTypes = (types: WorkflowNodeType[], nodes: WorkflowNode[]): WorkflowNodeType[] => {
  const present = new Set(nodes.map((node) => node.data.type));
  return types.filter((type) => !RUN_ORDER.includes(type) || !present.has(type));
};

/** Adds a step at its place in the run and connects it to the steps either side. */
export const insertStep = (type: WorkflowNodeType, nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const order = RUN_ORDER.indexOf(type);
  const inRun = orderSteps(nodes, edges).filter((node) => runOrderOf(node) >= 0);
  // A step outside the run order, such as a listing, hangs off the end of the run.
  const previous =
    order >= 0 ? inRun.filter((node) => runOrderOf(node) < order).at(-1) : inRun.filter((node) => node.data.type !== "export-zip").at(-1);
  const next = order >= 0 ? inRun.find((node) => runOrderOf(node) > order) : inRun.find((node) => node.data.type === "export-zip");

  const anchor = previous?.position ?? next?.position ?? { x: 0, y: 0 };
  const created = createWorkflowNode(type, { x: anchor.x + NEW_STEP_OFFSET.x, y: anchor.y + NEW_STEP_OFFSET.y });
  const [step = created] = withUniqueLabels([created], nodes);
  const nextNodes = [...nodes, step];

  let nextEdges = edges;
  if (order >= 0 && previous && next) {
    nextEdges = nextEdges.filter((edge) => !(edge.source === previous.id && edge.target === next.id));
  }
  if (previous) nextEdges = join(previous.id, step.id, nextEdges, nextNodes);
  if (next) nextEdges = join(step.id, next.id, nextEdges, nextNodes);

  return { nodes: nextNodes, edges: nextEdges, step };
};

/** Removes a step and joins the steps before it to the steps after it, so the run stays whole. */
export const removeStep = (nodeId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const nextNodes = nodes.filter((node) => node.id !== nodeId);
  const before = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
  const after = edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target);

  let nextEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
  for (const source of before) {
    for (const target of after) nextEdges = join(source, target, nextEdges, nextNodes);
  }

  return { nodes: nextNodes, edges: nextEdges };
};
