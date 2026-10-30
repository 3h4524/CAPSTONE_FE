import {
  DEFAULT_WORKFLOW_DEFINITION,
  DEFAULT_WORKFLOW_NAME,
  DEFAULT_WORKFLOW_POSITIONS,
  DUPLICATE_NODE_OFFSET,
  RUN_ORDER,
  WORKFLOW_NODE_DEFINITIONS,
} from "@/constants/workflow";
import { getWorkflowNodeDefinition, normalizeNodeConfig, readString } from "@/helpers/workflow-config";
import { findMissingMockupTemplates, isRunnableNode } from "@/helpers/workflow-run";
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

// A listing is written from the product's own details, so only the video waits for an approval.
const APPROVAL_REQUIRED_TYPES: WorkflowNodeType[] = ["generate-video"];
// The steps a video needs, each exactly once. The design steps may sit before Apply mock-up.
export const STANDARD_PIPELINE: WorkflowNodeType[] = ["product-input", "apply-mockup", "approval-gate", "generate-video", "review-video", "export-zip"];
// A workflow with one of these is making a video, so it has to be the whole video pipeline.
const VIDEO_ONLY_TYPES: WorkflowNodeType[] = ["approval-gate", "generate-video", "review-video"];

const runOrderOf = (type: WorkflowNodeType) => RUN_ORDER.indexOf(type);

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

export const getConnectionIssue = (
  connection: Connection | WorkflowEdge,
  edges: WorkflowEdge[],
  nodes?: WorkflowNode[]
): string | null => {
  const { source, target } = connection;
  if (!source || !target) return "Drop the connection on another node.";
  if (source === target) return "A node cannot connect to itself.";
  if (edges.some((edge) => edge.source === source && edge.target === target)) return "These nodes are already connected.";
  if (nodes) {
    // Two steps of a run connect only to the next step that is on the canvas, so no approval can be skipped.
    const fromNode = nodes.find(n => n.id === source);
    const toNode = nodes.find(n => n.id === target);
    const from = fromNode?.data.type;
    const to = toNode?.data.type;
    if (from && to && runOrderOf(from) >= 0 && runOrderOf(to) >= 0) {
      const next = nodes.map(n => runOrderOf(n.data.type)).filter(order => order > runOrderOf(from)).sort((a, b) => a - b)[0];
      if (runOrderOf(to) !== next) {
        const fromLabel = fromNode?.data.label ?? WORKFLOW_NODE_DEFINITIONS[from].label;
        if (next === undefined) return `${fromLabel} is the last step in the workflow, so it has no next node.`;
        const nextType = nodes.find(n => runOrderOf(n.data.type) === next)?.data.type;
        const nextLabel = nextType ? WORKFLOW_NODE_DEFINITIONS[nextType].label : "the next step";
        return `Steps run in order. Connect ${fromLabel} to ${nextLabel} next.`;
      }
    }
  }
  if (collectReachable([target], buildAdjacency(edges, "forward")).has(source)) return "That connection would create a loop. Workflows run in one direction.";
  return null;
};

export const isConnectionAllowed = (
  connection: Connection | WorkflowEdge,
  edges: WorkflowEdge[],
  nodes?: WorkflowNode[]
): boolean => getConnectionIssue(connection, edges, nodes) === null;

export const getConnectableNodeIds = (
  fromNodeId: string,
  fromHandleType: "source" | "target" | null,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] => {
  if (!nodes.some((node) => node.id === fromNodeId)) return [];
  const fromSource = fromHandleType !== "target";
  return nodes
    .filter((node) => {
      if (node.id === fromNodeId) return false;
      const definition = getWorkflowNodeDefinition(node.data.type);
      if (!(fromSource ? definition?.hasInput : definition?.hasOutput)) return false;
      const connection = fromSource
        ? { source: fromNodeId, target: node.id, sourceHandle: null, targetHandle: null }
        : { source: node.id, target: fromNodeId, sourceHandle: null, targetHandle: null };
      return isConnectionAllowed(connection, edges, nodes);
    })
    .map((node) => node.id);
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
      // The video is made from approved mock-ups.
      candidate.data.type === "approval-gate"
  );
};

// What the server checks before it starts the video part, so the problems show while editing: the six video
// steps once each, in one line in run order with the design steps (if any) before Apply mock-up, nothing that
// cannot run, and the product the video is for.
const validateVideoPipeline = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  if (!nodes.some(node => VIDEO_ONLY_TYPES.includes(node.data.type))) return [];
  const issues: WorkflowIssue[] = [];
  if (STANDARD_PIPELINE.some(type => nodes.filter(n => n.data.type === type).length !== 1))
    issues.push({ id: "mvp-pipeline", nodeId: null, message: "A video needs exactly one each of Product Input → Apply Mockup → Mockup Approval → Generate Video → Review Video → Export ZIP." });
  nodes.filter(node => !isRunnableNode(node.data.type)).forEach(node =>
    issues.push({ id: `video-unsupported-${node.id}`, nodeId: node.id, message: `${node.data.label} cannot run yet. Remove it to run the video.` })
  );

  const line = nodes.filter(node => runOrderOf(node.data.type) >= 0).sort((a, b) => runOrderOf(a.data.type) - runOrderOf(b.data.type));
  for (let i = 1; i < line.length; i++) {
    const previous = line[i - 1];
    const current = line[i];
    // Listing content waits for no approval, so it may also sit between two steps of the line.
    const throughListing = nodes.some(node => node.data.type === "generate-listing" && edges.some(e => e.source === previous.id && e.target === node.id) && edges.some(e => e.source === node.id && e.target === current.id));
    if (previous.data.type !== current.data.type && edges.filter(e => e.source === previous.id && e.target === current.id).length + (throughListing ? 1 : 0) !== 1)
      issues.push({ id: `required-edge-${current.id}`, nodeId: current.id, message: `${current.data.label} must follow ${previous.data.label}.` });
  }
  if (issues.length === 0 && edges.length !== nodes.length - 1)
    issues.push({ id: "video-extra-edges", nodeId: null, message: "A video runs its steps in one line. Remove the extra connections." });

  const input = nodes.find(node => node.data.type === "product-input");
  if (input && !readString(input.data.config.productId))
    issues.push({ id: `video-product-${input.id}`, nodeId: input.id, message: `${input.data.label}: Choose the product for the video.` });
  return issues;
};

export const validateWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [...validateVideoPipeline(nodes, edges)];
  const missingTemplates = findMissingMockupTemplates(nodes);
  if (missingTemplates) issues.push(missingTemplates);
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
        message: `${node.data.label} needs a Mockup Approval step before it.`,
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

const normalizeLabel = (label: string) => label.trim().toLowerCase();

export const uniqueNodeLabel = (baseLabel: string, takenLabels: string[]): string => {
  const taken = new Set(takenLabels.map(normalizeLabel));
  if (!taken.has(normalizeLabel(baseLabel))) return baseLabel;
  let suffix = 1;
  while (taken.has(normalizeLabel(`${baseLabel} ${suffix}`))) suffix += 1;
  return `${baseLabel} ${suffix}`;
};

export const withUniqueLabels = (added: WorkflowNode[], existing: WorkflowNode[]): WorkflowNode[] => {
  const taken = existing.map((node) => node.data.label);
  return added.map((node) => {
    const label = uniqueNodeLabel(WORKFLOW_NODE_DEFINITIONS[node.data.type].label, taken);
    taken.push(label);
    return { ...node, data: { ...node.data, label } };
  });
};

export const duplicateWorkflowSelection = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  selectedIds: string[],
  offset = DUPLICATE_NODE_OFFSET
): { nodes: WorkflowNode[]; edges: WorkflowEdge[]; addedNodeIds: string[] } => {
  const selected = new Set(selectedIds);
  const nextIdByOldId = new Map<string, string>();
  const duplicatedNodes: WorkflowNode[] = [];
  const addedNodeIds: string[] = [];
  nodes.forEach((node) => {
    if (!selected.has(node.id)) return;
    const nextId = uuid();
    nextIdByOldId.set(node.id, nextId);
    addedNodeIds.push(nextId);
    duplicatedNodes.push({
      ...node,
      id: nextId,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      selected: true,
      data: { ...node.data, config: { ...node.data.config }, status: "idle" },
    });
  });
  const duplicatedEdges: WorkflowEdge[] = [];
  edges.forEach((edge) => {
    const nextSource = nextIdByOldId.get(edge.source);
    const nextTarget = nextIdByOldId.get(edge.target);
    if (!nextSource || !nextTarget) return;
    duplicatedEdges.push({ ...edge, id: uuid(), source: nextSource, target: nextTarget, selected: false });
  });
  return { nodes: duplicatedNodes, edges: duplicatedEdges, addedNodeIds };
};

export const toWorkflowNodes = (definition: WorkflowDefinition): WorkflowNode[] =>
  definition.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    data: {
      type: node.type,
      label: node.label,
      config: normalizeNodeConfig(node.type, node.config),
      status: "idle",
    },
  }));

export const toWorkflowEdges = (definition: WorkflowDefinition): WorkflowEdge[] =>
  definition.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

export const toWorkflowDefinition = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  viewport: Viewport
): WorkflowDefinition => ({
  version: 2,
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
  revision: workflow.revision,
});

export const applyCompactDefaultLayoutIfStillVertical = (workflow: WorkflowDetail): WorkflowDetail => {
  if (workflow.name !== DEFAULT_WORKFLOW_NAME) return workflow;
  const defaultTypes = new Map(DEFAULT_WORKFLOW_DEFINITION.nodes.map((node) => [node.id, node.type]));
  const nodes = workflow.definition.nodes;
  if (nodes.length !== defaultTypes.size) return workflow;
  if (!nodes.every((node) => defaultTypes.get(node.id) === node.type)) return workflow;
  if (Math.max(...nodes.map((node) => node.position.x)) >= 400) return workflow;
  return {
    ...workflow,
    definition: {
      ...workflow.definition,
      nodes: nodes.map((node) => ({
        ...node,
        position: DEFAULT_WORKFLOW_POSITIONS[node.id] ?? node.position,
      })),
    },
  };
};

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
