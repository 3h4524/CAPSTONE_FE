import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrintifyRunStatus, RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { type GroupPrintify, groupPrintify } from "@/hooks/queries/use-group-printify";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import { renderWithQuery } from "@/test/render-with-query";
import type { AiShotQuote, RunGroupTarget, WorkflowNodeRun, WorkflowRun } from "@/types/video-workflow";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  run: null as WorkflowRun | null,
  action: vi.fn(),
  quote: vi.fn(),
  ask: vi.fn(),
  group: null as GroupPrintify | null,
  getRun: vi.fn(),
}));

vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: mocks.run, isError: false, refetch: vi.fn() }) }));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({ useWorkflowRunAction: () => ({ mutate: mocks.action, isPending: false }) }));
vi.mock("@/api/video-workflow", () => ({
  quoteAiShot: mocks.quote,
  getWorkflowRun: mocks.getRun,
  videoWorkflowKeys: { run: (id: string | null) => ["workflow-runs", id] },
}));
vi.mock("@/hooks/queries/use-group-printify", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useGroupPrintify: () => mocks.group,
}));
vi.mock("@/hooks/queries/use-run-group", () => ({ useRunGroupId: () => "group-1" }));
vi.mock("@/stores/cost-confirm", () => ({ askCostConfirm: mocks.ask }));
vi.mock("@/components/shop/etsy-publish-dialog", () => ({ EtsyPublishDialog: () => null }));
vi.mock("@/components/shop/printify-publish-dialog", () => ({ PrintifyPublishDialog: () => null }));
// The scene settings are validated where they are edited; here the canvas holds settings taken as valid.
vi.mock("@/schemas/workflow", () => ({ generateVideoConfigSchema: { safeParse: (data: unknown) => ({ success: true, data }) } }));

const step = (nodeType: string, status: string) => ({ id: nodeType, nodeId: nodeType, nodeType, status, attempt: 1, stage: null, progress: 0, errorMessage: null, output: {} }) as unknown as WorkflowNodeRun;

const stopped = (nodeTypes: string[]): WorkflowRun =>
  ({
    id: "run-1", workflowId: "wf", productId: "p", status: "cancelled", revision: 9, workflowRevision: 2, createdAt: "",
    errorMessage: null, nodes: nodeTypes.map((type) => step(type, "cancelled")), runGroupId: null, artworkGroupKey: null,
  }) as unknown as WorkflowRun;

const ai = {
  mode: "ai_shot", target: "etsy", template: "auto", durationSeconds: 6, assetSelection: "automatic", selectedMockupIds: [],
  sceneOrder: [], textOverlay: "", standardOptions: { motionPreset: "varied", crop: "safe", transition: "fade" }, fallbackToStandard: true,
  aiScenes: [{ mode: "ai", templateCode: "cinematic_product_showcase", durationSeconds: 6 }],
};

const quote = (overrides: Partial<AiShotQuote> = {}): AiShotQuote => ({
  token: "quote-token", estimatedCostUsd: 0.48, newClips: 1, expiresAtUtc: "", model: "MiniMax-H3", note: "", changesWhatIsMade: false,
  ...overrides,
});

const showCanvas = () => {
  const nodes = [buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config: ai as never, status: "idle" } })];
  useWorkflowStore.setState({ nodes, edges: [] });
};

describe("RunStatusPanel: a stopped run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ask.mockResolvedValue(true);
    showCanvas();
  });

  it("resumes a run without a video at once", async () => {
    mocks.run = stopped(["product-input", "approval-gate", "publish-printify"]);
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(mocks.action).toHaveBeenCalledWith({ runId: "run-1", expectedRevision: 9, action: "resume" });
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("resumes with the same settings without asking: their cost was shown on Run", async () => {
    mocks.run = stopped(["approval-gate", "generate-video"]);
    mocks.quote.mockResolvedValue(quote());
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(mocks.action).toHaveBeenCalled());
    expect(mocks.ask).not.toHaveBeenCalled();
    expect(mocks.action.mock.calls[0]![0]).toMatchObject({ action: "resume", aiShotQuoteToken: "quote-token" });
  });

  it("shows the cost of only the clips a change adds before resuming with it", async () => {
    mocks.run = stopped(["approval-gate", "generate-video"]);
    mocks.quote.mockResolvedValue(quote({ changesWhatIsMade: true, estimatedCostUsd: 0.24 }));
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(mocks.action).toHaveBeenCalled());
    expect(mocks.ask).toHaveBeenCalledTimes(1);
    expect(mocks.ask.mock.calls[0]![0]).toMatchObject({ totalUsd: 0.24 });
  });

  it("resumes nothing when the seller declines the cost of a change", async () => {
    mocks.run = stopped(["approval-gate", "generate-video"]);
    mocks.quote.mockResolvedValue(quote({ changesWhatIsMade: true }));
    mocks.ask.mockResolvedValue(false);
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(mocks.ask).toHaveBeenCalled());
    expect(mocks.action).not.toHaveBeenCalled();
  });
});

const withSteps = (status: string, steps: [string, string][]): WorkflowRun =>
  ({ ...stopped([]), status, nodes: steps.map(([type, stepStatus]) => step(type, stepStatus)) }) as WorkflowRun;

describe("RunStatusPanel: Push to Printify beside the video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ask.mockResolvedValue(true);
    showCanvas();
  });

  it("retries a failed Push to Printify on its own while the video goes on", async () => {
    mocks.run = withSteps("running", [["publish-printify", "failed"], ["generate-video", "running"]]);
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Retry Push to Printify" }));

    expect(mocks.action).toHaveBeenCalledWith({ runId: "run-1", expectedRevision: 9, action: "retry" });
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("offers no separate Printify retry while Printify goes on", () => {
    mocks.run = withSteps("running", [["publish-printify", "running"], ["generate-video", "failed"]]);
    render(<RunStatusPanel />);

    expect(screen.queryByRole("button", { name: "Retry Push to Printify" })).not.toBeInTheDocument();
  });

  it("offers only the Printify retry when Printify alone failed the run, keeping the finished video", async () => {
    mocks.run = withSteps("failed", [["publish-printify", "failed"], ["generate-video", "succeeded"], ["review-video", "succeeded"]]);
    render(<RunStatusPanel />);

    expect(screen.queryByRole("button", { name: "Retry checkpoint" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Regenerate AI clips" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry Push to Printify" }));

    expect(mocks.action).toHaveBeenCalledWith({ runId: "run-1", expectedRevision: 9, action: "retry" });
  });

  it("retries the video with the canvas settings when it failed too, Printify going again with it", async () => {
    mocks.run = withSteps("failed", [["publish-printify", "failed"], ["generate-video", "failed"]]);
    mocks.quote.mockResolvedValue(quote());
    render(<RunStatusPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Retry checkpoint" }));

    await waitFor(() => expect(mocks.action).toHaveBeenCalled());
    expect(mocks.quote).toHaveBeenCalled();
    expect(mocks.action.mock.calls[0]![0]).toMatchObject({ action: "retry", config: expect.anything() });
  });
});

describe("PrintifyRunStatus: only the Printify step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showCanvas();
  });

  it("does not show the video's render beside a failed Printify, and shows why Printify failed", async () => {
    const run = withSteps("running", [["publish-printify", "failed"], ["generate-video", "running"]]);
    run.nodes[0] = { ...run.nodes[0]!, errorMessage: "Printify rejected the product." };
    run.nodes[1] = { ...run.nodes[1]!, stage: "Rendering", progress: 55 };
    mocks.run = run;
    render(<PrintifyRunStatus />);

    expect(screen.queryByText(/Rendering/)).not.toBeInTheDocument();
    expect(screen.queryByText(/video/i)).not.toBeInTheDocument();
    expect(screen.getByText("Printify rejected the product.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry Push to Printify" }));
    expect(mocks.action).toHaveBeenCalledWith({ runId: "run-1", expectedRevision: 9, action: "retry" });
  });

  it("shows the progress of the Printify step itself", () => {
    const run = withSteps("running", [["publish-printify", "running"], ["generate-video", "running"]]);
    run.nodes[0] = { ...run.nodes[0]!, stage: "Uploading images", progress: 40 };
    mocks.run = run;
    render(<PrintifyRunStatus />);

    expect(screen.getByText("Uploading images · 40%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retry|Resume/ })).not.toBeInTheDocument();
  });

  it("leaves the video's failure to the video steps", () => {
    mocks.run = withSteps("failed", [["publish-printify", "failed"], ["generate-video", "failed"]]);
    render(<PrintifyRunStatus />);

    expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
  });
});

const design = (index: number, printify: RunGroupTarget["printify"], videoStatus = "running"): RunGroupTarget => ({
  key: `p:d${index}`, productId: "p", productName: `Tee ${index + 1}`, productType: "tshirt", artworkGroupKey: `d${index}`,
  designLabel: `Design ${index + 1}`, previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
  hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: `run-${index}`, runStatus: "running", videoStatus,
  printify, currentStep: "generate-video", stage: null, progress: 0, runError: null, config: null, hasOwnConfig: false,
});
const printifyStep = (status: string, error: string | null = null) => ({ status, stage: null, progress: 0, error });

describe("PrintifyRunStatus: a batch run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.run = null;
    showCanvas();
  });

  it("lists each design's Printify step with why it failed, and retries that design's run alone", async () => {
    mocks.group = groupPrintify([design(0, printifyStep("succeeded")), design(1, printifyStep("failed", "Your Printify API key is not working."))]);
    mocks.getRun.mockResolvedValue({ id: "run-1", revision: 7 });
    renderWithQuery(<PrintifyRunStatus />);

    expect(screen.getByText("1 of 2 on Printify · 1 failed")).toBeInTheDocument();
    expect(screen.getByText("Your Printify API key is not working.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry Push to Printify" }));

    await waitFor(() => expect(mocks.action).toHaveBeenCalled());
    expect(mocks.action.mock.calls[0]![0]).toEqual({ runId: "run-1", expectedRevision: 7, action: "retry" });
  });

  it("offers no Printify retry for a design whose video failed too", () => {
    mocks.group = groupPrintify([design(0, printifyStep("failed", "Rejected."), "failed")]);
    renderWithQuery(<PrintifyRunStatus />);

    expect(screen.queryByRole("button", { name: "Retry Push to Printify" })).not.toBeInTheDocument();
  });
});

describe("groupPrintify", () => {
  it("reads running while any design is pushed, failed once one failed, done when all are", () => {
    expect(groupPrintify([design(0, printifyStep("running")), design(1, printifyStep("failed"))])?.status).toBe("running");
    expect(groupPrintify([design(0, printifyStep("succeeded")), design(1, printifyStep("failed"))])?.status).toBe("failed");
    expect(groupPrintify([design(0, printifyStep("succeeded")), design(1, printifyStep("succeeded"))])?.status).toBe("success");
    expect(groupPrintify([design(0, printifyStep("pending"))])?.status).toBe("idle");
  });

  it("is null when no design has the step", () => {
    expect(groupPrintify([design(0, null)])).toBeNull();
  });
});
