import {
  DEFAULT_WORKFLOW_DEFINITION,
  DEFAULT_WORKFLOW_NAME,
  DEFAULT_WORKFLOW_POSITIONS,
  DUPLICATE_NODE_OFFSET,
  PRINTIFY_SOURCES,
  RUN_ORDER,
  WORKFLOW_NODE_DEFINITIONS,
} from "@/constants/workflow";
import { offsetWaypoints, readWaypoints } from "@/helpers/edge-waypoints";
import { getWorkflowNodeDefinition, normalizeNodeConfig, readString } from "@/helpers/workflow-config";
import { findMissingMockupTemplates, isRunnableNode, publishesWithoutVideo, supportsBatchVideos } from "@/helpers/workflow-run";
import { i18n } from "@/i18n/client";
import { nodeConfigSchemaIn } from "@/schemas/workflow";
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
export const STANDARD_PIPELINE: WorkflowNodeType[] = ["product-input", "apply-mockup", "approval-gate", "generate-video", "review-video"];
// Steps a video may leave out (at most once each): without Export ZIP, Review Video leads to the publish steps.
export const OPTIONAL_VIDEO_STEPS: WorkflowNodeType[] = ["export-zip"];
// The steps a run that publishes without a video needs, each exactly once, before the publish steps.
export const PUBLISH_PIPELINE: WorkflowNodeType[] = ["product-input", "apply-mockup", "approval-gate"];
// A workflow with one of these is making a video, so it has to be the whole video pipeline.
const VIDEO_ONLY_TYPES: WorkflowNodeType[] = ["approval-gate", "generate-video", "review-video"];

const PRINTIFY: WorkflowNodeType = "publish-printify";

// A step's place in the line of the run. Push to Printify is not on the line: it branches off Apply mock-up or Mockup
// Approval, as the backend checks.
const runOrderOf = (type: WorkflowNodeType) => (type === PRINTIFY ? -1 : RUN_ORDER.indexOf(type));

const printifySourceMessage = () => i18n.t("workflowConfig.checks.printifySource");
const printifyEndMessage = () => i18n.t("workflowConfig.checks.printifyEnd");
const nodeTypeLabel = (type: WorkflowNodeType) =>
  i18n.t(`workflowEditor.nodeTypes.${type}.label`, { defaultValue: WORKFLOW_NODE_DEFINITIONS[type].label });

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

/** What an Apply mock-up node's mock-ups are for: export only, or a Printify product. */
export type MockupTarget = "zip" | "printify";

/** Whether a Push to Printify step follows this node, so its mock-ups must show the Printify product. */
export const hasPrintifyDownstream = (nodeId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const reachable = collectReachable([nodeId], buildAdjacency(edges, "forward"));
  return nodes.some((node) => node.id !== nodeId && node.data.type === "publish-printify" && reachable.has(node.id));
};

/** The node's own choice, except that a Push to Printify step after it always makes it "printify". */
export const effectiveMockupTarget = (node: WorkflowNode, nodes: WorkflowNode[], edges: WorkflowEdge[]): MockupTarget =>
  node.data.config.mockupTarget === "printify" || hasPrintifyDownstream(node.id, nodes, edges) ? "printify" : "zip";

export const getConnectionIssue = (
  connection: Connection | WorkflowEdge,
  edges: WorkflowEdge[],
  nodes?: WorkflowNode[]
): string | null => {
  const { source, target } = connection;
  if (!source || !target) return i18n.t("workflowConfig.checks.dropOnNode");
  if (source === target) return i18n.t("workflowConfig.checks.selfConnection");
  if (edges.some((edge) => edge.source === source && edge.target === target)) return i18n.t("workflowConfig.checks.alreadyConnected");
  if (nodes) {
    // Two steps of a run connect only to the next step that is on the canvas, so no approval can be skipped.
    const fromNode = nodes.find(n => n.id === source);
    const toNode = nodes.find(n => n.id === target);
    const from = fromNode?.data.type;
    const to = toNode?.data.type;
    // Push to Printify takes the design and its approved mock-ups, not the video: it branches off one of the mock-up
    // steps and nothing follows it.
    if (from === PRINTIFY) return printifyEndMessage();
    if (to === PRINTIFY) {
      if (!from || !PRINTIFY_SOURCES.includes(from)) return printifySourceMessage();
      if (edges.some((edge) => edge.target === target)) return i18n.t("workflowConfig.checks.printifyAlreadyFollows");
    }
    if (from && to && runOrderOf(from) >= 0 && runOrderOf(to) >= 0) {
      const next = nodes.map(n => runOrderOf(n.data.type)).filter(order => order > runOrderOf(from)).sort((a, b) => a - b)[0];
      if (runOrderOf(to) !== next) {
        const fromLabel = fromNode?.data.label ?? nodeTypeLabel(from);
        if (next === undefined) return i18n.t("workflowConfig.checks.lastStep", { label: fromLabel });
        const nextType = nodes.find(n => runOrderOf(n.data.type) === next)?.data.type;
        const nextLabel = nextType ? nodeTypeLabel(nextType) : i18n.t("workflowConfig.checks.theNextStep");
        return i18n.t("workflowConfig.checks.runInOrder", { from: fromLabel, next: nextLabel });
      }
    }
  }
  if (collectReachable([target], buildAdjacency(edges, "forward")).has(source)) return i18n.t("workflowConfig.checks.loop");
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

// Push to Printify hangs off Apply mock-up or Mockup Approval, once, with nothing after it (the backend checks the same).
const printifyIssues = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] =>
  nodes.filter(node => node.data.type === PRINTIFY).flatMap(node => {
    const into = edges.filter(e => e.target === node.id).map(e => nodes.find(n => n.id === e.source)?.data.type);
    const issues: WorkflowIssue[] = [];
    if (into.length !== 1 || !into[0] || !PRINTIFY_SOURCES.includes(into[0]))
      issues.push({ id: `printify-source-${node.id}`, nodeId: node.id, message: printifySourceMessage() });
    if (edges.some(e => e.source === node.id))
      issues.push({ id: `printify-end-${node.id}`, nodeId: node.id, message: printifyEndMessage() });
    return issues;
  });

// The steps of a run sit in one line in run order, each connected to the one before, so no approval is skipped.
// Listing content waits for no approval, so it may also sit between two steps of the line; Push to Printify branches off it.
const lineIssues = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [];
  const line = nodes.filter(node => runOrderOf(node.data.type) >= 0).sort((a, b) => runOrderOf(a.data.type) - runOrderOf(b.data.type));
  for (let i = 1; i < line.length; i++) {
    const previous = line[i - 1];
    const current = line[i];
    const throughListing = nodes.some(node => node.data.type === "generate-listing" && edges.some(e => e.source === previous.id && e.target === node.id) && edges.some(e => e.source === node.id && e.target === current.id));
    if (previous.data.type !== current.data.type && edges.filter(e => e.source === previous.id && e.target === current.id).length + (throughListing ? 1 : 0) !== 1)
      issues.push({ id: `required-edge-${current.id}`, nodeId: current.id, message: i18n.t("workflowConfig.checks.mustFollow", { label: current.data.label, previous: previous.data.label }) });
  }
  return issues;
};

// What the server checks before it publishes without a video: Product Input → Apply mock-up → Mockup Approval once
// each, then the publish steps, in one line; Review Video and Export ZIP need the video. Each design approved at
// Mockup Approval is published, so no product is chosen beforehand.
const validatePublishPipeline = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [];
  if (PUBLISH_PIPELINE.some(type => nodes.filter(n => n.data.type === type).length !== 1))
    issues.push({ id: "publish-pipeline", nodeId: null, message: i18n.t("workflowConfig.checks.publishPipeline") });
  nodes.filter(node => node.data.type === "review-video" || node.data.type === "export-zip").forEach(node =>
    issues.push({ id: `publish-needs-video-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.publishNeedsVideo", { label: node.data.label }) })
  );
  nodes.filter(node => !isRunnableNode(node.data.type)).forEach(node =>
    issues.push({ id: `publish-unsupported-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.cannotRunWorkflow", { label: node.data.label }) })
  );
  issues.push(...lineIssues(nodes, edges));
  if (issues.length === 0 && edges.length !== nodes.length - 1)
    issues.push({ id: "publish-extra-edges", nodeId: null, message: i18n.t("workflowConfig.checks.publishExtraEdges") });
  return issues;
};

// What the server checks before it starts the video part, so the problems show while editing: the six video
// steps once each, in one line in run order with the design steps (if any) before Apply mock-up, nothing that
// cannot run, and the product the video is for.
const validateVideoPipeline = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  if (!nodes.some(node => VIDEO_ONLY_TYPES.includes(node.data.type))) return [];
  const issues: WorkflowIssue[] = [];
  if (STANDARD_PIPELINE.some(type => nodes.filter(n => n.data.type === type).length !== 1) ||
    OPTIONAL_VIDEO_STEPS.some(type => nodes.filter(n => n.data.type === type).length > 1))
    issues.push({ id: "mvp-pipeline", nodeId: null, message: i18n.t("workflowConfig.checks.videoPipeline") });
  nodes.filter(node => !isRunnableNode(node.data.type)).forEach(node =>
    issues.push({ id: `video-unsupported-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.cannotRunVideo", { label: node.data.label }) })
  );

  issues.push(...lineIssues(nodes, edges));
  if (issues.length === 0 && edges.length !== nodes.length - 1)
    issues.push({ id: "video-extra-edges", nodeId: null, message: i18n.t("workflowConfig.checks.videoExtraEdges") });

  // A scene list makes a video for every design chosen at Mockup Approval; other settings fit one product only.
  const input = nodes.find(node => node.data.type === "product-input");
  // The product is stored in Product input but chosen at Mockup Approval, so the issue points there.
  const approval = nodes.find(node => node.data.type === "approval-gate");
  if (input && !readString(input.data.config.productId) && !supportsBatchVideos(nodes))
    issues.push({ id: `video-product-${input.id}`, nodeId: approval?.id ?? input.id, message: i18n.t("workflowConfig.checks.videoProduct") });
  return issues;
};

export const validateWorkflow = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  // Publishing comes last: after Export ZIP of a video, or right after Mockup Approval without one.
  const issues: WorkflowIssue[] = publishesWithoutVideo(nodes) ? validatePublishPipeline(nodes, edges) : validateVideoPipeline(nodes, edges);
  issues.push(...printifyIssues(nodes, edges));
  const missingTemplates = findMissingMockupTemplates(nodes);
  if (missingTemplates) issues.push(missingTemplates);
  const inputNodes = nodes.filter((node) => node.data.type === "product-input");

  if (inputNodes.length === 0) {
    issues.push({ id: "missing-input", nodeId: null, message: i18n.t("workflowConfig.checks.missingInput") });
  }
  inputNodes.slice(1).forEach((node) =>
    issues.push({ id: `extra-input-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.extraInput") })
  );

  if (!nodes.some((node) => WORKFLOW_NODE_DEFINITIONS[node.data.type].category === "output")) {
    issues.push({ id: "missing-output", nodeId: null, message: i18n.t("workflowConfig.checks.missingOutput") });
  }

  const reachable = collectReachable(
    inputNodes.map((node) => node.id),
    buildAdjacency(edges, "forward")
  );

  nodes.forEach((node) => {
    if (inputNodes.length > 0 && !reachable.has(node.id)) {
      issues.push({ id: `unreachable-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.unreachable", { label: node.data.label }) });
    }

    const parsed = nodeConfigSchemaIn(node.data.type, nodes).safeParse(node.data.config);
    if (!parsed.success) {
      const [firstIssue] = parsed.error.issues;
      issues.push({ id: `config-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.configIssue", { label: node.data.label, issue: firstIssue?.message ?? i18n.t("workflowConfig.checks.checkSettings") }) });
    }

    // Printify mock-ups need a template. One per product type is checked where the templates are loaded: in the picker
    // and before a run (printifySelectionIssue).
    if (node.data.type === "apply-mockup" && effectiveMockupTarget(node, nodes, edges) === "printify") {
      const chosen = Array.isArray(node.data.config.mockupTemplateIds) ? node.data.config.mockupTemplateIds.length : 0;
      if (chosen === 0)
        issues.push({ id: `printify-template-${node.id}`, nodeId: node.id, message: i18n.t("workflowConfig.checks.printifyTemplate", { label: node.data.label }) });
    }

    if (APPROVAL_REQUIRED_TYPES.includes(node.data.type) && !hasApprovalUpstream(node, nodes, edges)) {
      issues.push({
        id: `approval-${node.id}`,
        nodeId: node.id,
        message: i18n.t("workflowConfig.checks.needsApproval", { label: node.data.label }),
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
    const waypoints = offsetWaypoints(edge.data, offset);
    duplicatedEdges.push({
      ...edge,
      id: uuid(),
      source: nextSource,
      target: nextTarget,
      selected: false,
      data: waypoints ? { ...edge.data, waypoints } : edge.data,
    });
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
  definition.edges.map((edge) => {
    const waypoints = readWaypoints(edge);
    return waypoints.length > 0
      ? { id: edge.id, source: edge.source, target: edge.target, data: { waypoints } }
      : { id: edge.id, source: edge.source, target: edge.target };
  });

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
  edges: edges.map((edge) => {
    const waypoints = readWaypoints(edge.data).map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    return waypoints.length > 0
      ? { id: edge.id, source: edge.source, target: edge.target, waypoints }
      : { id: edge.id, source: edge.source, target: edge.target };
  }),
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
