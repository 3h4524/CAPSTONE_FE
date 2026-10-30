import { NODE_CARD_WIDTHS, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { createWorkflowNode, getConnectionIssue, withUniqueLabels } from "@/helpers/workflow-graph";
import type { AssistantCanvasOperation } from "@/types/assistant";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";
import { addEdge, type Connection } from "@xyflow/react";

const NODE_GAP = 80;
const NEW_COLUMN_OFFSET = 360;

export type CanvasPatchSkip = { operation: AssistantCanvasOperation; reason: string };

export type CanvasPatchResult = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  applied: number;
  skipped: CanvasPatchSkip[];
};

type PatchState = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

type ConfigObject = Record<string, unknown>;

const isConfigObject = (value: unknown): value is ConfigObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeConfig = (current: ConfigObject, patch: ConfigObject): ConfigObject => {
  const merged: ConfigObject = { ...current };
  Object.entries(patch).forEach(([key, value]) => {
    const existing = merged[key];
    merged[key] = isConfigObject(existing) && isConfigObject(value) ? mergeConfig(existing, value) : value;
  });
  return merged;
};

type OperationOutcome = { state: PatchState } | { reason: string };

const labelOf = (nodeId: string | null | undefined, nodes: WorkflowNode[]) => {
  const node = nodes.find((item) => item.id === nodeId);
  return node?.data.label ?? "a step";
};

const nextPosition = (nodes: WorkflowNode[], after: WorkflowNode | undefined) => {
  if (after) return { x: after.position.x + NODE_CARD_WIDTHS[after.data.type] + NODE_GAP, y: after.position.y };
  const maxX = nodes.reduce((max, node) => Math.max(max, node.position.x), 0);
  return { x: maxX + NEW_COLUMN_OFFSET, y: nodes[0]?.position.y ?? 0 };
};

export const applyCanvasPatch = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  operations: AssistantCanvasOperation[]
): CanvasPatchResult => {
  const refMap = new Map<string, string>();
  const skipped: CanvasPatchSkip[] = [];
  let state: PatchState = { nodes, edges };
  let applied = 0;

  const resolve = (value: string | null | undefined) => {
    if (!value) return undefined;
    const id = refMap.get(value) ?? value;
    return state.nodes.some((node) => node.id === id) ? id : undefined;
  };

  const runOperation = (operation: AssistantCanvasOperation): OperationOutcome => {
    switch (operation.op) {
      case "add_node": {
        if (!operation.type || !WORKFLOW_NODE_DEFINITIONS[operation.type]) return { reason: "Unknown step type" };
        const afterId = resolve(operation.after);
        if (operation.after && !afterId) return { reason: "The step to add after was not found" };
        const after = state.nodes.find((node) => node.id === afterId);
        const created = createWorkflowNode(operation.type, nextPosition(state.nodes, after));
        const [node = created] = withUniqueLabels([created], state.nodes);
        if (operation.ref) refMap.set(operation.ref, node.id);
        return { state: { nodes: [...state.nodes, node], edges: state.edges } };
      }
      case "remove_node": {
        const nodeId = resolve(operation.nodeId);
        if (!nodeId) return { reason: "Step not found" };
        return {
          state: {
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
          },
        };
      }
      case "connect": {
        const source = resolve(operation.source);
        const target = resolve(operation.target);
        if (!source || !target) return { reason: "Step not found" };
        const connection: Connection = { source, target, sourceHandle: null, targetHandle: null };
        const issue = getConnectionIssue(connection, state.edges, state.nodes);
        if (issue) return { reason: issue };
        return { state: { nodes: state.nodes, edges: addEdge(connection, state.edges) } };
      }
      case "disconnect": {
        const source = resolve(operation.source);
        const target = resolve(operation.target);
        if (!source || !target) return { reason: "Step not found" };
        const remaining = state.edges.filter((edge) => !(edge.source === source && edge.target === target));
        if (remaining.length === state.edges.length) return { reason: "Those steps are not connected" };
        return { state: { nodes: state.nodes, edges: remaining } };
      }
      case "update_config": {
        const nodeId = resolve(operation.nodeId);
        if (!nodeId) return { reason: "Step not found" };
        if (!operation.config) return { reason: "No settings to update" };
        const config = operation.config;
        return {
          state: {
            nodes: state.nodes.map((node) =>
              node.id === nodeId ? { ...node, data: { ...node.data, config: mergeConfig(node.data.config, config) } } : node
            ),
            edges: state.edges,
          },
        };
      }
      case "rename_node":
        return { reason: "Renaming steps is turned off" };
    }
  };

  operations.forEach((operation) => {
    const outcome = runOperation(operation);
    if ("reason" in outcome) {
      skipped.push({ operation, reason: outcome.reason });
      return;
    }
    state = outcome.state;
    applied += 1;
  });

  return { nodes: state.nodes, edges: state.edges, applied, skipped };
};

const proposedLabel = (id: string, operations: AssistantCanvasOperation[]) => {
  const added = operations.find((candidate) => candidate.op === "add_node" && candidate.ref === id);
  if (!added) return undefined;
  return added.label ?? (added.type ? WORKFLOW_NODE_DEFINITIONS[added.type]?.label : undefined);
};

export const describeCanvasOperation = (
  operation: AssistantCanvasOperation,
  nodes: WorkflowNode[],
  operations: AssistantCanvasOperation[] = []
): string => {
  const known = (id: string | null | undefined) => {
    if (!id) return "a step";
    if (nodes.some((node) => node.id === id)) return labelOf(id, nodes);
    return proposedLabel(id, operations) ?? id;
  };
  const name = operation.label ?? (operation.type ? WORKFLOW_NODE_DEFINITIONS[operation.type]?.label : undefined) ?? "step";
  switch (operation.op) {
    case "add_node":
      return operation.after ? `Add "${name}" after "${known(operation.after)}"` : `Add "${name}"`;
    case "remove_node":
      return `Remove "${known(operation.nodeId)}"`;
    case "connect":
      return `Connect "${known(operation.source)}" → "${known(operation.target)}"`;
    case "disconnect":
      return `Disconnect "${known(operation.source)}" from "${known(operation.target)}"`;
    case "update_config":
      return `Change settings of "${known(operation.nodeId)}"`;
    case "rename_node":
      return `Rename "${known(operation.nodeId)}" to "${operation.label ?? ""}"`;
  }
};
