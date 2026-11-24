import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunGroupPanel } from "@/components/workflows/run/run-group-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import type { GenerateVideoConfig, MockupAsset, RunGroup } from "@/types/video-workflow";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  confirm: vi.fn(),
  resume: vi.fn(),
  assets: [] as MockupAsset[],
  printWithoutAi: true,
}));

vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/mutations/use-run-group-actions", () => ({
  useConfirmRunGroup: () => ({ mutate: mocks.confirm, isPending: false }),
  useCancelRunGroup: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeRunGroup: () => ({ mutate: mocks.resume, isPending: false }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ selectRun: vi.fn() }) }));
vi.mock("@/hooks/use-sync-generated-mockups", () => ({ useSyncGeneratedMockups: () => false }));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({ useMockupAssets: () => ({ data: mocks.assets, isPending: false, dataUpdatedAt: 0 }) }));
vi.mock("@/hooks/mutations/use-review-mockup-asset", () => ({ useReviewMockupAsset: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/hooks/use-query-client", () => ({ useAppQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/queries/use-ai-video-templates", () => ({
  useAiVideoTemplates: () => ({ data: [{ code: "lifestyle_in_use", requiresLifestyle: true }, { code: "cinematic_product_showcase", requiresLifestyle: false }] }),
}));
vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => mocks.printWithoutAi }));
vi.mock("@/components/workflows/media/lifestyle-mockup-form", () => ({
  LifestyleMockupForm: () => <p>AI form for the model photo</p>,
  lifestyleGarmentsOf: () => [],
}));
vi.mock("@/components/workflows/media/model-photo-mockup-form", () => ({
  ModelPhotoMockupForm: ({ productId }: { productId: string }) => <p>model photo form for {productId}</p>,
}));
const { askMock } = vi.hoisted(() => ({ askMock: vi.fn() }));
vi.mock("@/stores/cost-confirm", () => ({ askCostConfirm: askMock }));

const standard = { mode: "standard", aiScenes: [{ mode: "standard" }] } as GenerateVideoConfig;
const ai = { mode: "ai_shot", aiScenes: [{ mode: "ai", templateCode: "cinematic_product_showcase" }] } as GenerateVideoConfig;
const person = { mode: "ai_shot", aiScenes: [{ mode: "ai", templateCode: "lifestyle_in_use" }] } as GenerateVideoConfig;

const group = (ownConfig: GenerateVideoConfig | null = null): RunGroup => ({
  id: "group-1", workflowId: "wf", batchId: "batch", batchJobId: null, status: "waiting_for_targets", revision: 4,
  workflowRevision: 1, createdAt: "", maximumTargets: 10, selectedCount: 1,
  progress: { total: 0, queued: 0, running: 0, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets: [{
    key: "p:d", productId: "p", productName: "June Rose Tee", productType: "tshirt", artworkGroupKey: "d",
    designLabel: "Design 1", previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
    hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: null, runStatus: null,
    currentStep: null, stage: null, progress: 0, runError: null, config: ownConfig, hasOwnConfig: Boolean(ownConfig),
  }],
});

const showCanvas = (config: GenerateVideoConfig, approval: "auto" | "manual" = "manual") => {
  const nodes = [
    buildWorkflowNode({
      id: "gate",
      data: { type: "approval-gate", label: "Mockup Approval", config: { mode: approval } as never, status: "idle" },
    }),
    buildWorkflowNode({
      id: "video",
      data: { type: "generate-video", label: "Generate Video", config: config as never, status: "idle" },
    }),
  ];
  useWorkflowStore.setState({ nodes, edges: [], savedGraph: { nodes, edges: [] }, isDirty: false, designScope: null });
};

describe("RunGroupPanel: starting the videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assets = [];
    mocks.printWithoutAi = true;
    mocks.group = group();
    showCanvas(standard);
  });

  it("starts Standard videos without asking for a cost", async () => {
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(askMock).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledWith({ groupId: "group-1", expectedRevision: 4 }, expect.anything());
  });

  it("starts AI videos at once too: their cost was shown when the seller pressed Run", async () => {
    showCanvas(ai);
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(askMock).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledWith({ groupId: "group-1", expectedRevision: 4 }, expect.anything());
  });

  it("asks nothing either when only one design has AI settings of its own", async () => {
    mocks.group = group(ai);
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(askMock).not.toHaveBeenCalled();
  });

  it("offers to make the product's model photo only when a scene shows a person", () => {
    const { unmount } = render(<RunGroupPanel />);
    expect(screen.queryByText(/model photo form/)).not.toBeInTheDocument();
    unmount();

    showCanvas(person);
    render(<RunGroupPanel />);

    expect(screen.getByText("model photo form for p")).toBeInTheDocument();
  });

  it("offers the AI form for the model photo while printing without AI is off", () => {
    mocks.printWithoutAi = false;
    showCanvas(person);
    render(<RunGroupPanel />);

    expect(screen.getByText("AI form for the model photo")).toBeInTheDocument();
    expect(screen.queryByText("model photo form for p")).not.toBeInTheDocument();
  });

  it("names the design that cannot be rendered and why, and lets Continue make its model photo again", () => {
    const blocked = group();
    blocked.targets[0].resolveError = "Scene 1 shows a person, and this design has no approved model photo.";
    mocks.group = blocked;
    render(<RunGroupPanel />);

    expect(screen.getAllByText(/no approved model photo/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("says an automatic run is getting ready by itself, and keeps Continue off until it is", () => {
    showCanvas(standard, "auto");
    const preparing = group();
    preparing.preparing = true;
    mocks.group = preparing;
    render(<RunGroupPanel />);

    expect(screen.getByText(/Getting the videos ready/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("stands in for a model photo still being made with a placeholder card, and keeps Continue off for that design", () => {
    showCanvas(person);
    const preparing = group();
    preparing.preparing = true;
    preparing.targets[0].modelPhoto = "pending";
    mocks.group = preparing;
    render(<RunGroupPanel />);

    expect(screen.getByText("Making the model photo…")).toBeInTheDocument();
    expect(screen.getByText(/Review the mock-ups meanwhile/)).toBeInTheDocument();
    expect(screen.queryByText(/Getting the videos ready/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("lets a manual run go on with a design whose model photo is made while another's is still being made", () => {
    showCanvas(person);
    const preparing = group();
    preparing.preparing = true;
    preparing.selectedCount = 1;
    preparing.targets[0].modelPhoto = "ready";
    preparing.targets.push({ ...preparing.targets[0], key: "q:d", productId: "q", productName: "Dune Tee", selected: false, approvedCount: 0, modelPhoto: "pending" });
    mocks.group = preparing;
    render(<RunGroupPanel />);

    // The other design is not chosen, so what is still being made for it holds nothing back.
    expect(screen.getAllByText("Making the model photo…")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("says a model photo that was not made will be tried again by Continue", () => {
    showCanvas(person);
    const missing = group();
    missing.targets[0].modelPhoto = "missing";
    mocks.group = missing;
    render(<RunGroupPanel />);

    expect(screen.getByText(/model photo of this design was not made/)).toBeInTheDocument();
    expect(screen.queryByText("Making the model photo…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("says why a run set to approve automatically is still waiting", () => {
    const waiting = group();
    waiting.notice = "DAVIES T-Shirt · Design 1: its model photo could not be made. Ideogram is busy.";
    mocks.group = waiting;
    render(<RunGroupPanel />);

    expect(screen.getByText(/did not start\. DAVIES T-Shirt · Design 1: its model photo could not be made/)).toBeInTheDocument();
  });
});

const mockup = (id: string, approvalStatus: string) =>
  ({
    id, productId: "p", artworkGroupKey: "d", role: "Hero", approvalStatus, previewUrl: `https://cdn.test/${id}.png`,
    width: 100, height: 100, variantKey: "#FFFFFF", warnings: [], revision: 1,
  }) as unknown as MockupAsset;

describe("RunGroupPanel: once the videos started", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showCanvas(standard);
    const started = group();
    started.status = "completed";
    started.targets[0] = { ...started.targets[0], runId: "run-1", runStatus: "completed" };
    mocks.group = started;
  });

  it("keeps the design's approved mock-ups in view, without offering to review them again", () => {
    mocks.assets = [mockup("front", "approved"), mockup("back", "approved"), mockup("left", "rejected")];
    render(<RunGroupPanel />);

    expect(screen.getByText("2 approved mock-ups")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /mock-up, approved/ })).toHaveLength(2);
    expect(screen.queryByRole("img", { name: /rejected/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve mock-up" })).not.toBeInTheDocument();
  });

  it("offers to resume a stopped run from where it stopped", async () => {
    mocks.group = { ...mocks.group!, status: "cancelled", revision: 6 };
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    expect(mocks.resume).toHaveBeenCalledWith({ groupId: "group-1", expectedRevision: 6 }, expect.anything());
  });

  it("offers no resume while the run goes on", () => {
    render(<RunGroupPanel />);

    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
  });
});
