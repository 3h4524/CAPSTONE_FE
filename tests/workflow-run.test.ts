import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_WORKFLOW_DEFINITION, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { artworkGroupLabel } from "@/helpers/artwork-groups";
import { normalizeNodeConfig } from "@/helpers/workflow-config";
import { isConnectionAllowed, toWorkflowEdges, toWorkflowNodes, validateWorkflow } from "@/helpers/workflow-graph";
import {
  countApprovals,
  deriveNodeStatuses,
  estimateMockupCount,
  extractMockupSelection,
  extractRunPlan,
  hasBatchSteps,
  hasVideoSteps,
  isRunBusy,
  type RunSnapshot,
  validateRunnable,
} from "@/helpers/workflow-run";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeType } from "@/types/workflow";

const id = "bd48d15b-57b9-47b9-84cc-d30a0fb6ad59";
const other = "0d6e5a5e-6a3c-4d0f-9b7a-2f0c1d3e4a5b";

// The default workflow with every step given valid settings.
const configured = () => {
  const nodes = toWorkflowNodes(DEFAULT_WORKFLOW_DEFINITION);
  const set = (type: WorkflowNodeType, config: Record<string, unknown>) => {
    const node = nodes.find((item) => item.data.type === type)!;
    node.data.config = { ...node.data.config, ...config };
  };
  set("product-input", { batchId: id, productId: id });
  set("prompt-synthesis", { designTemplateId: id });
  set("apply-mockup", { mockupTemplateIds: [id] });
  return { nodes, edges: toWorkflowEdges(DEFAULT_WORKFLOW_DEFINITION) };
};

const without = ({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }, ...types: WorkflowNodeType[]) => {
  const kept = nodes.filter((node) => !types.includes(node.data.type));
  const keptIds = new Set(kept.map((node) => node.id));
  return { nodes: kept, edges: edges.filter((edge) => keptIds.has(edge.source) && keptIds.has(edge.target)) };
};

const byType = (nodes: WorkflowNode[], type: WorkflowNodeType) => nodes.find((node) => node.data.type === type)!;
const connection = (source: WorkflowNode, target: WorkflowNode) => ({ source: source.id, target: target.id, sourceHandle: null, targetHandle: null });

const image = (imageId: string, approvalStatus: string) => ({ id: imageId, imageUrl: "u", variationIndex: 1, widthPx: 1, heightPx: 1, approvalStatus });
const product = (productId: string, productType: string, images: ReturnType<typeof image>[]) =>
  ({ id: productId, productId, productName: productId, productType, sequence: 1, status: "s", errorMessage: null, images });
const job = (extra: Partial<BatchJobDetail>, products = [product("p1", "tshirt", [image("a", "approved"), image("b", "pending")]), product("p2", "mug", [image("c", "rejected")])]) =>
  ({ status: "completed", products, ...extra }) as unknown as BatchJobDetail;
const watching = (current: BatchJobDetail | null, mockupState: RunSnapshot["mockupState"] = "idle"): RunSnapshot => ({ step: "watching", job: current, mockupState });

test("the default workflow has both parts: designs and mock-ups, then the video", () => {
  const { nodes } = configured();
  assert.equal(hasBatchSteps(nodes), true);
  assert.equal(hasVideoSteps(nodes), true);
  assert.deepEqual(nodes.map((node) => node.data.type), [
    "product-input", "prompt-synthesis", "design-image", "design-approval", "apply-mockup", "approval-gate", "generate-video", "review-video", "export-zip",
  ]);
});

test("a configured default workflow can start its batch part and has no graph errors", () => {
  const { nodes, edges } = configured();
  assert.deepEqual(validateRunnable(nodes, edges), []);
  assert.deepEqual(validateWorkflow(nodes, edges), []);
});

test("the batch part asks for a mock-up template only when it generates designs", () => {
  const { nodes, edges } = configured();
  byType(nodes, "apply-mockup").data.config = { ...byType(nodes, "apply-mockup").data.config, mockupTemplateIds: [] };
  assert.equal(validateRunnable(nodes, edges).some((issue) => issue.message.includes("Choose at least one mock-up template")), true);
  assert.equal(validateWorkflow(nodes, edges).some((issue) => issue.message.includes("Choose at least one mock-up template")), true);

  // Uploaded mock-ups only: nothing is composited, so no template is needed.
  const videoOnly = without({ nodes, edges }, "prompt-synthesis", "design-image", "design-approval");
  videoOnly.edges.push({ id: "input-mockup", source: byType(nodes, "product-input").id, target: byType(nodes, "apply-mockup").id });
  assert.deepEqual(validateWorkflow(videoOnly.nodes, videoOnly.edges), []);
});

test("Design approval decides whether the job waits for a review", () => {
  const { nodes } = configured();
  assert.equal(extractRunPlan(nodes).requireApproval, true);
  byType(nodes, "design-approval").data.config = { mode: "auto" };
  assert.equal(extractRunPlan(nodes).requireApproval, false);
  assert.equal(extractRunPlan(nodes.filter((node) => node.data.type !== "design-approval")).requireApproval, false);
  // Mockup Approval belongs to the video: it never makes the designs wait.
  assert.equal(extractRunPlan(nodes.filter((node) => node.data.type !== "design-approval")).mockup?.templateIds[0], id);
});

test("the batch job gives statuses to its own steps and leaves the video steps alone", () => {
  const { nodes } = configured();
  const statuses = deriveNodeStatuses(nodes, watching(job({ requireApproval: true })));
  const statusOf = (type: WorkflowNodeType) => statuses[byType(nodes, type).id];
  assert.equal(statusOf("design-image"), "success");
  assert.equal(statusOf("design-approval"), "waiting_for_review");
  assert.equal(statusOf("apply-mockup"), "idle");
  for (const type of ["approval-gate", "generate-video", "review-video", "export-zip"] as const) assert.equal(statusOf(type), undefined);
});

test("Design approval stops waiting once the mock-ups are asked for", () => {
  const { nodes } = configured();
  const gate = byType(nodes, "design-approval").id;
  assert.equal(deriveNodeStatuses(nodes, watching(job({ requireApproval: true }), "running"))[gate], "success");
  assert.equal(deriveNodeStatuses(nodes, watching(job({ requireApproval: false })))[gate], "success");
  assert.equal(deriveNodeStatuses(nodes, watching(job({})))[gate], "success");
  assert.equal(deriveNodeStatuses(nodes, watching(job({ requireApproval: true, status: "running" })))[gate], "idle");
  assert.equal(isRunBusy(watching(job({ requireApproval: true }))), false);
});

test("steps no backend runs are skipped once a run exists", () => {
  const nodes = toWorkflowNodes({ ...DEFAULT_WORKFLOW_DEFINITION, nodes: [...DEFAULT_WORKFLOW_DEFINITION.nodes, { id: "listing", type: "generate-listing", label: "Listing content", position: { x: 0, y: 0 }, config: {} }] });
  assert.equal(deriveNodeStatuses(nodes, watching(job({})))["listing"], "skipped");
  assert.equal(deriveNodeStatuses(nodes, { step: "idle", job: null, mockupState: "idle" })["listing"], "idle");
});

test("a video needs its product, its six steps and nothing that cannot run", () => {
  const { nodes, edges } = configured();
  byType(nodes, "product-input").data.config = { batchId: id, productId: "" };
  assert.equal(validateWorkflow(nodes, edges).some((issue) => issue.message.includes("Choose the product for the video")), true);

  const noReview = without(configured(), "review-video");
  assert.equal(validateWorkflow(noReview.nodes, noReview.edges).some((issue) => issue.id === "mvp-pipeline"), true);

  const withListing = configured();
  withListing.nodes.push({ ...byType(withListing.nodes, "export-zip"), id: "listing", data: { type: "generate-listing", label: "Listing content", status: "idle", config: WORKFLOW_NODE_DEFINITIONS["generate-listing"].defaultConfig } });
  assert.equal(validateWorkflow(withListing.nodes, withListing.edges).some((issue) => issue.id === "video-unsupported-listing"), true);
});

test("a workflow without video steps is not held to the video rules", () => {
  const designsOnly = without(configured(), "approval-gate", "generate-video", "review-video");
  const mockups = byType(designsOnly.nodes, "apply-mockup");
  designsOnly.edges.push({ id: "mockup-export", source: mockups.id, target: byType(designsOnly.nodes, "export-zip").id });
  byType(designsOnly.nodes, "product-input").data.config = { batchId: id, productId: "" };
  assert.deepEqual(validateWorkflow(designsOnly.nodes, designsOnly.edges), []);
  assert.equal(hasVideoSteps(designsOnly.nodes), false);
});

test("steps connect to the next step on the canvas, so no approval is skipped", () => {
  const { nodes } = configured();
  const allowed = (from: WorkflowNodeType, to: WorkflowNodeType, on = nodes) => isConnectionAllowed(connection(byType(nodes, from), byType(nodes, to)), [], on);
  assert.equal(allowed("design-image", "design-approval"), true);
  assert.equal(allowed("design-image", "apply-mockup"), false);
  assert.equal(allowed("apply-mockup", "approval-gate"), true);
  assert.equal(allowed("apply-mockup", "generate-video"), false);
  assert.equal(allowed("apply-mockup", "design-image"), false);
  // With no Design approval on the canvas, the designs go straight to the mock-ups.
  assert.equal(allowed("design-image", "apply-mockup", nodes.filter((node) => node.data.type !== "design-approval")), true);
  // Uploaded mock-ups only: Product input leads straight to Apply mock-up.
  assert.equal(allowed("product-input", "apply-mockup", nodes.filter((node) => !["prompt-synthesis", "design-image", "design-approval"].includes(node.data.type))), true);
});

test("a loaded config keeps what the node declares and drops the rest", () => {
  const mockup = normalizeNodeConfig("apply-mockup", { mockupTemplateIds: [id], garmentColors: ["#111111"], artworkGroupKey: "summer" });
  assert.deepEqual(mockup, { mockupTemplateIds: [id], templateColors: {}, mockupIds: [], artworkGroupKey: "summer" });

  const video = normalizeNodeConfig("generate-video", { template: "design_detail", standardOptions: { motionPreset: "zoom", crop: "safe", transition: "cut" }, withMusic: true });
  assert.equal(video.template, "design_detail");
  assert.deepEqual(video.standardOptions, { motionPreset: "zoom", crop: "safe", transition: "cut" });
  assert.equal(video.durationSeconds, 12);
  assert.equal("withMusic" in video, false);

  assert.deepEqual(normalizeNodeConfig("product-input", { batchId: id }), { batchId: id, productId: "" });
});

test("the mock-up selection sends colors only for the templates that are selected", () => {
  const selection = extractMockupSelection({ mockupTemplateIds: [id], templateColors: { [id]: ["#1F2A44"], [other]: ["#B22222"], empty: [] } });
  assert.deepEqual(selection, { templateIds: [id], garmentColors: [], templateColors: { [id]: ["#1F2A44"] } });
});

test("approvals are counted per design and estimate the mock-ups they make", () => {
  assert.deepEqual(countApprovals(job({})), { pending: 1, approved: 1, rejected: 1 });
  const approved = job({}, [product("p1", "tshirt", [image("a", "approved"), image("b", "approved"), image("x", "rejected")]), product("p2", "mug", [image("c", "approved")])]);
  const templates = [{ id: "t1", productType: "tshirt", allowRecolor: true }, { id: "m1", productType: "mug", allowRecolor: false }, { id: "h1", productType: "hoodie", allowRecolor: true }];
  assert.equal(estimateMockupCount(approved, { templateIds: ["t1", "m1"], garmentColors: [], templateColors: { t1: ["#1", "#2"] } }, templates), 5);
  assert.equal(estimateMockupCount(approved, { templateIds: ["t1"], garmentColors: [], templateColors: {} }, templates), 2);
  assert.equal(estimateMockupCount(approved, { templateIds: ["h1"], garmentColors: [], templateColors: {} }, templates), 0);
});

test("artwork groups keyed by an id are numbered, named ones keep their name", () => {
  const groups = [id, "summer-drop", other];
  assert.equal(artworkGroupLabel(id, groups), "Design 1");
  assert.equal(artworkGroupLabel(other, groups), "Design 2");
  assert.equal(artworkGroupLabel("summer-drop", groups), "summer-drop");
});
