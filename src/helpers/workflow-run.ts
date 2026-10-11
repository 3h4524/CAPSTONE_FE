import { BATCH_RUN_NODE_TYPES, RUNNABLE_NODE_TYPES, VIDEO_RUN_NODE_TYPES } from "@/constants/workflow";
import { readNumber, readString, readStringArray, readTemplateColors } from "@/helpers/workflow-config";
import { workflowNodeConfigSchemas } from "@/schemas/workflow";
import type { MockupState, RunStep } from "@/stores/workflow-run";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { WorkflowEdge, WorkflowIssue, WorkflowNode, WorkflowNodeConfig, WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";

export const ACTIVE_JOB_STATUSES = ["queued", "running", "paused"];
export const FINISHED_JOB_STATUSES = ["completed", "partially_completed", "failed"];
// Statuses after which every product that could get an image has one.
export const DESIGNS_READY_STATUSES = ["completed", "partially_completed"];

/** What a run sends to the job as its mock-up selection. */
export type MockupSelection = { templateIds: string[]; garmentColors: string[]; templateColors: Record<string, string[]> };

export type RunPlan = {
  batchId: string;
  designTemplateId: string;
  styleArtPresetId: string | null;
  instructions: string;
  variationCount: number;
  aspectRatio: string;
  mockup: MockupSelection | null;
  /** true when Design approval is set to manual review: mock-ups wait until the designs are approved. */
  requireApproval: boolean;
};

export const isRunnableNode = (type: WorkflowNodeType) => RUNNABLE_NODE_TYPES.includes(type);

/** A step of the part the canvas runs as a batch job: designs, their approval and the mock-ups. */
export const isBatchRunNode = (type: WorkflowNodeType) => BATCH_RUN_NODE_TYPES.includes(type);

/** A step of the part the server runs for one product: mock-up approval, video, video review and the ZIP. */
export const isVideoRunNode = (type: WorkflowNodeType) => VIDEO_RUN_NODE_TYPES.includes(type);

/** The workflow generates designs, so a run starts with a batch job. */
export const hasBatchSteps = (nodes: WorkflowNode[]) =>
  nodes.some((node) => node.data.type === "prompt-synthesis" || node.data.type === "design-image");

/** The workflow makes a video, so a run includes the server's video run. */
export const hasVideoSteps = (nodes: WorkflowNode[]) => nodes.some((node) => node.data.type === "generate-video");

const findByType = (nodes: WorkflowNode[], type: WorkflowNodeType) => nodes.filter((node) => node.data.type === type);

const reachableFrom = (startId: string, edges: WorkflowEdge[]) => {
  const visited = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    edges.filter((edge) => edge.source === current).forEach((edge) => stack.push(edge.target));
  }
  return visited;
};

const SINGLE_NODE_LABELS: Partial<Record<WorkflowNodeType, string>> = {
  "product-input": "Product input",
  "prompt-synthesis": "Prompt synthesis",
  "design-image": "Design image",
};

// The batch part of a run drives one batch job: Product input -> Prompt synthesis -> Design image, then
// optionally Design approval -> Apply mock-up. This checks the graph has exactly that shape and valid
// settings; the video steps are checked by the server when its run starts, and the rest are skipped.
export const validateRunnable = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowIssue[] => {
  const issues: WorkflowIssue[] = [];

  (Object.keys(SINGLE_NODE_LABELS) as WorkflowNodeType[]).forEach((type) => {
    const found = findByType(nodes, type);
    if (found.length === 0) {
      issues.push({ id: `run-missing-${type}`, nodeId: null, message: `Add a ${SINGLE_NODE_LABELS[type]} node to run the workflow.` });
    }
    found.slice(1).forEach((node) =>
      issues.push({ id: `run-extra-${node.id}`, nodeId: node.id, message: `A run supports one ${SINGLE_NODE_LABELS[type]} node.` })
    );
  });
  (["design-approval", "apply-mockup"] as WorkflowNodeType[]).forEach((type) => {
    findByType(nodes, type)
      .slice(1)
      .forEach((node) => issues.push({ id: `run-extra-${node.id}`, nodeId: node.id, message: `A run supports one ${node.data.label} node.` }));
  });
  if (issues.length > 0) return issues;

  nodes
    .filter((node) => isBatchRunNode(node.data.type))
    .forEach((node) => {
      const parsed = workflowNodeConfigSchemas[node.data.type].safeParse(node.data.config);
      if (!parsed.success) {
        const [first] = parsed.error.issues;
        issues.push({ id: `run-config-${node.id}`, nodeId: node.id, message: `${node.data.label}: ${first?.message ?? "check its settings."}` });
      }
    });

  const [input] = findByType(nodes, "product-input");
  const [prompt] = findByType(nodes, "prompt-synthesis");
  const [design] = findByType(nodes, "design-image");
  const [mockup] = findByType(nodes, "apply-mockup");
  if (!reachableFrom(input.id, edges).has(prompt.id)) {
    issues.push({ id: "run-prompt-link", nodeId: prompt.id, message: "Connect Prompt synthesis after the Product input." });
  }
  if (!reachableFrom(prompt.id, edges).has(design.id)) {
    issues.push({ id: "run-design-link", nodeId: design.id, message: "Connect Design image after Prompt synthesis." });
  }
  if (mockup && !reachableFrom(design.id, edges).has(mockup.id)) {
    issues.push({ id: "run-mockup-link", nodeId: mockup.id, message: "Connect Apply mock-up after Design image." });
  }
  const missingTemplates = findMissingMockupTemplates(nodes);
  if (missingTemplates) issues.push(missingTemplates);
  return issues;
};

// The mock-ups of generated designs need a template to be placed on. (A workflow that only makes a video
// from uploaded mock-ups has no designs to place, so its Apply mock-up node may stay empty.)
export const findMissingMockupTemplates = (nodes: WorkflowNode[]): WorkflowIssue | null => {
  const [mockup] = findByType(nodes, "apply-mockup");
  if (!mockup || !hasBatchSteps(nodes) || readStringArray(mockup.data.config.mockupTemplateIds).length > 0) return null;
  return { id: `run-templates-${mockup.id}`, nodeId: mockup.id, message: `${mockup.data.label}: Choose at least one mock-up template.` };
};

// Reads the settings of an already validated graph.
export const extractRunPlan = (nodes: WorkflowNode[]): RunPlan => {
  const config = (type: WorkflowNodeType) => findByType(nodes, type)[0]?.data.config ?? {};
  const prompt = config("prompt-synthesis");
  const design = config("design-image");
  const mockup = findByType(nodes, "apply-mockup")[0]?.data.config;
  return {
    batchId: readString(config("product-input").batchId),
    designTemplateId: readString(prompt.designTemplateId),
    styleArtPresetId: readString(prompt.stylePresetId) || null,
    instructions: readString(prompt.instructions).trim(),
    variationCount: readNumber(design.variants) ?? 1,
    aspectRatio: readString(design.aspectRatio) || "1:1",
    mockup: mockup
      ? extractMockupSelection(mockup)
      : null,
    // Without a Design approval step the designs flow straight through, exactly as with Auto-approve.
    requireApproval: findByType(nodes, "design-approval").length > 0 && readString(config("design-approval").mode) === "manual",
  };
};

export type RunSnapshot = { step: RunStep; job: BatchJobDetail | null; mockupState: MockupState };

// The statuses the batch part of a run gives its nodes: from the job on the server once it exists, from
// the runner's own step before that. Nodes no backend can run are skipped as soon as a run exists.
// The video steps are left out: the server's video run reports those.
export const deriveNodeStatuses = (nodes: WorkflowNode[], run: RunSnapshot): Record<string, WorkflowNodeStatus> => {
  const hasRun = run.step !== "idle" || run.job !== null;
  const status = run.job?.status ?? "";
  const designsReady = DESIGNS_READY_STATUSES.includes(status);
  const hasMockupNode = nodes.some((node) => node.data.type === "apply-mockup");

  const statusOf = (type: WorkflowNodeType): WorkflowNodeStatus => {
    if (!hasRun) return "idle";
    if (!isRunnableNode(type)) return "skipped";

    switch (type) {
      case "product-input":
        return run.step === "preparing-job" ? "running" : "success";
      case "prompt-synthesis":
        if (run.step === "preparing-job" || run.step === "saving-mockups") return "idle";
        if (run.step === "starting") return "running";
        return status === "draft" ? "idle" : "success";
      case "design-image":
        if (ACTIVE_JOB_STATUSES.includes(status)) return "running";
        if (designsReady) return "success";
        if (status === "failed") return "failed";
        return run.step === "watching" && !run.job ? "running" : "idle";
      case "design-approval":
        if (designsReady) {
          // Paused until the person approves designs and asks for the mock-ups (or, with no mock-up step, has reviewed them all).
          const waiting = run.job?.requireApproval === true && run.mockupState === "idle" && (hasMockupNode || countApprovals(run.job).pending > 0);
          return waiting ? "waiting_for_review" : "success";
        }
        return status === "failed" ? "skipped" : "idle";
      case "apply-mockup":
        if (status === "failed") return "skipped";
        if (!designsReady) return "idle";
        if (run.mockupState === "running") return "running";
        if (run.mockupState === "done") return "success";
        return run.mockupState === "failed" ? "failed" : "idle";
      default:
        return "skipped";
    }
  };

  return Object.fromEntries(
    nodes.filter((node) => !isVideoRunNode(node.data.type)).map((node) => [node.id, statusOf(node.data.type)])
  );
};

export const isRunBusy = (run: RunSnapshot) =>
  (run.step !== "idle" && run.step !== "watching") ||
  (run.step === "watching" && run.job === null) ||
  ACTIVE_JOB_STATUSES.includes(run.job?.status ?? "") ||
  run.mockupState === "running";

// The mock-up selection of an Apply mock-up node: its templates, the colors each template was given and the
// shared list older workflows were saved with. Colors of a template that is no longer selected are left out,
// since the backend rejects a color list for a template that is not part of the selection.
export const extractMockupSelection = (config: WorkflowNodeConfig): MockupSelection => {
  const templateIds = readStringArray(config.mockupTemplateIds);
  const templateColors = Object.fromEntries(
    Object.entries(readTemplateColors(config.templateColors)).filter(([id, colors]) => templateIds.includes(id) && colors.length > 0)
  );
  return { templateIds, garmentColors: [], templateColors };
};

export type ApprovalCounts = { pending: number; approved: number; rejected: number };

// How the generated designs of a job stand: waiting for a decision, approved, or rejected.
export const countApprovals = (job: BatchJobDetail): ApprovalCounts => {
  const counts: ApprovalCounts = { pending: 0, approved: 0, rejected: 0 };
  job.products.forEach((product) =>
    product.images.forEach((image) => {
      if (image.approvalStatus === "approved") counts.approved += 1;
      else if (image.approvalStatus === "rejected") counts.rejected += 1;
      else counts.pending += 1;
    })
  );
  return counts;
};

type EstimatedTemplate = { id: string; productType: string; allowRecolor: boolean };

// How many mock-ups the approved designs would make: each approved design on every selected template of its
// product type, once per color picked for a recolorable template. The backend has the final say (a template whose
// photo was not analyzed yet makes one), so this is an estimate.
export const estimateMockupCount = (job: BatchJobDetail, selection: MockupSelection, templates: EstimatedTemplate[]): number => {
  const approvedByType: Record<string, number> = {};
  job.products.forEach((product) => {
    const approved = product.images.filter((image) => image.approvalStatus === "approved").length;
    const type = product.productType.toLowerCase();
    approvedByType[type] = (approvedByType[type] ?? 0) + approved;
  });

  return templates
    .filter((template) => selection.templateIds.includes(template.id))
    .reduce((total, template) => {
      const colors = template.allowRecolor ? Math.max(1, (selection.templateColors[template.id] ?? []).length) : 1;
      return total + (approvedByType[template.productType.toLowerCase()] ?? 0) * colors;
    }, 0);
};

// The status the server's video run gives a step, as the canvas shows it.
export const toCanvasStatus = (status: string): WorkflowNodeStatus => {
  switch (status) {
    case "running": return "running";
    case "succeeded": return "success";
    case "failed": return "failed";
    case "waiting_for_input": return "waiting_for_input";
    case "waiting_for_review": return "waiting_for_review";
    case "cancelled": return "cancelled";
    case "skipped": return "skipped";
    default: return "idle";
  }
};
