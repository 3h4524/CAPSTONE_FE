import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { readBoolean } from "@/helpers/workflow-config";
import { workflowNodeConfigSchemas } from "@/schemas/workflow";
import type {
  WorkflowDefinition,
  WorkflowDetail,
  WorkflowEdge,
  WorkflowIssue,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowPosition,
  WorkflowSummary,
} from "@/types/workflow";
import { uuid } from "@/utils/uuid";
import type { Connection, Viewport } from "@xyflow/react";

const APPROVAL_REQUIRED_TYPES: WorkflowNodeType[] = ["generate-video", "generate-listing"];

const buildAdjacency = (edges: WorkflowEdge[], direction: "forward" | "backward") => {
  const adjacency = new Map<string, string[]>();
  edges.forEach((edge) => {
    const [from, to] = direction === "forward" ? [edge.source, edge.target] : [edge.target, edge.source];
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  });
  return adjacency;
};

const collectReachable = (startIds: string[], adjacency: Map<string, string[]>) => {
  const visited = new Set<string>();
  const stack = [...startIds];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return visited;
};

export const isConnectionAllowed = (
  connection: Connection | WorkflowEdge,
  edges: WorkflowEdge[]
): boolean => {
  const { source, target } = connection;
  if (!source || !target || source === target) return false;
  if (edges.some((edge) => edge.source === source && edge.target === target)) return false;
  return !collectReachable([target], buildAdjacency(edges, "forward")).has(source);
};

export const getExecutionOrder = (nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] => {
  const inDegree = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1));
  const adjacency = buildAdjacency(edges, "forward");
  const queue = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    order.push(current);
    (adjacency.get(current) ?? []).forEach((next) => {
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    });
  }

  return order;
};

const hasApprovalUpstream = (node: WorkflowNode, nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const ancestors = collectReachable([node.id], buildAdjacency(edges, "backward"));
  return nodes.some(
    (candidate) =>
      candidate.id !== node.id &&
      ancestors.has(candidate.id) &&
      (candidate.data.type === "approval-gate" ||
        (candidate.data.type === "design-image" && readBoolean(candidate.data.config.autoApprove)))
  );
};

export const validateWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [];
  const inputNodes = nodes.filter((node) => node.data.type === "product-input");

  if (inputNodes.length === 0) {
    issues.push({ id: "missing-input", nodeId: null, message: "Add a Product input node to start the workflow." });
  }
  inputNodes.slice(1).forEach((node) =>
    issues.push({ id: `extra-input-${node.id}`, nodeId: node.id, message: "A workflow can only have one Product input." })
  );

  if (!nodes.some((node) => WORKFLOW_NODE_DEFINITIONS[node.data.type].category === "output")) {
    issues.push({ id: "missing-output", nodeId: null, message: "Add at least one output step such as Export ZIP." });
  }

  const reachable = collectReachable(
    inputNodes.map((node) => node.id),
    buildAdjacency(edges, "forward")
  );

  nodes.forEach((node) => {
    if (inputNodes.length > 0 && !reachable.has(node.id)) {
      issues.push({ id: `unreachable-${node.id}`, nodeId: node.id, message: `${node.data.label} is not connected to the Product input.` });
    }

    const parsed = workflowNodeConfigSchemas[node.data.type].safeParse(node.data.config);
    if (!parsed.success) {
      const [firstIssue] = parsed.error.issues;
      issues.push({ id: `config-${node.id}`, nodeId: node.id, message: `${node.data.label}: ${firstIssue?.message ?? "check its settings."}` });
    }

    if (APPROVAL_REQUIRED_TYPES.includes(node.data.type) && !hasApprovalUpstream(node, nodes, edges)) {
      issues.push({
        id: `approval-${node.id}`,
        nodeId: node.id,
        message: `${node.data.label} needs an Approval gate (or auto-approved designs) before it.`,
      });
    }
  });

  return issues;
};

export const createWorkflowNode = (type: WorkflowNodeType, position: WorkflowPosition): WorkflowNode => ({
  id: uuid(),
  type: "workflow",
  position,
  data: {
    type,
    label: WORKFLOW_NODE_DEFINITIONS[type].label,
    config: { ...WORKFLOW_NODE_DEFINITIONS[type].defaultConfig },
    status: "idle",
  },
});

export const toWorkflowNodes = (definition: WorkflowDefinition): WorkflowNode[] =>
  definition.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    data: { type: node.type, label: node.label, config: node.config, status: "idle" },
  }));

export const toWorkflowEdges = (definition: WorkflowDefinition): WorkflowEdge[] =>
  definition.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

export const toWorkflowDefinition = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  viewport: Viewport
): WorkflowDefinition => ({
  version: 1,
  nodes: nodes.map((node) => ({
    id: node.id,
    type: node.data.type,
    label: node.data.label,
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    config: node.data.config,
  })),
  edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
  viewport,
});

export const toWorkflowSummary = (workflow: WorkflowDetail): WorkflowSummary => ({
  id: workflow.id,
  name: workflow.name,
  description: workflow.description,
  nodeCount: workflow.nodeCount,
  updatedAt: workflow.updatedAt,
});

export const sortWorkflowSummaries = (workflows: WorkflowSummary[]) =>
  [...workflows].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

export const resolveActiveWorkflowId = (workflows: WorkflowSummary[], requestedId: string | null) =>
  workflows.find((workflow) => workflow.id === requestedId)?.id ?? sortWorkflowSummaries(workflows)[0]?.id ?? null;

export const getCopyName = (name: string, existingNames: string[]) => {
  const taken = new Set(existingNames.map((item) => item.toLowerCase()));
  const base = `${name} copy`;
  if (!taken.has(base.toLowerCase())) return base;
  let index = 2;
  while (taken.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
};
