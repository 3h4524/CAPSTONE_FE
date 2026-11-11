import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunGroupPanel } from "@/components/workflows/run/run-group-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import type { GenerateVideoConfig, RunGroup } from "@/types/video-workflow";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  confirm: vi.fn(),
  confirmCost: vi.fn(),
}));

vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/mutations/use-run-group-actions", () => ({
  useConfirmRunGroup: () => ({ mutate: mocks.confirm, isPending: false }),
  useCancelRunGroup: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ selectRun: vi.fn() }) }));
vi.mock("@/hooks/use-sync-generated-mockups", () => ({ useSyncGeneratedMockups: () => false }));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({ useMockupAssets: () => ({ data: [], isPending: false, dataUpdatedAt: 0 }) }));
vi.mock("@/hooks/mutations/use-review-mockup-asset", () => ({ useReviewMockupAsset: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/hooks/use-query-client", () => ({ useAppQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }) }));
vi.mock("@/hooks/queries/use-ai-video-templates", () => ({
  useAiVideoTemplates: () => ({ data: [{ code: "lifestyle_in_use", requiresLifestyle: true }, { code: "cinematic_product_showcase", requiresLifestyle: false }] }),
}));
vi.mock("@/components/workflows/media/model-photo-mockup-form", () => ({
  ModelPhotoMockupForm: ({ productId }: { productId: string }) => <p>model photo form for {productId}</p>,
}));
vi.mock("@/helpers/confirm-ai-shot", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, confirmRunGroupAiShot: mocks.confirmCost };
});

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

const showCanvas = (config: GenerateVideoConfig) => {
  const nodes = [buildWorkflowNode({
    id: "video",
    data: { type: "generate-video", label: "Generate Video", config: config as never, status: "idle" },
  })];
  useWorkflowStore.setState({ nodes, edges: [], savedGraph: { nodes, edges: [] }, isDirty: false, designScope: null });
};

describe("RunGroupPanel: starting the videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.group = group();
    showCanvas(standard);
  });

  it("starts Standard videos without asking for a cost", async () => {
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mocks.confirmCost).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledWith(
      { groupId: "group-1", expectedRevision: 4, aiShotQuoteToken: undefined },
      expect.anything()
    );
  });

  it("confirms what every design's AI clips cost, then starts them with that token", async () => {
    showCanvas(ai);
    mocks.confirmCost.mockResolvedValue("group-token");
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue (AI)" }));

    await waitFor(() => expect(mocks.confirmCost).toHaveBeenCalledWith("group-1", 4));
    expect(mocks.confirm).toHaveBeenCalledWith(
      { groupId: "group-1", expectedRevision: 4, aiShotQuoteToken: "group-token" },
      expect.anything()
    );
  });

  it("asks for the cost when only one design has AI settings of its own", async () => {
    mocks.group = group(ai);
    mocks.confirmCost.mockResolvedValue("group-token");
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue (AI)" }));

    await waitFor(() => expect(mocks.confirmCost).toHaveBeenCalled());
  });

  it("starts nothing when the seller declines the cost", async () => {
    showCanvas(ai);
    mocks.confirmCost.mockResolvedValue(null);
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Continue (AI)" }));

    await waitFor(() => expect(mocks.confirmCost).toHaveBeenCalled());
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("offers to make the product's model photo only when a scene shows a person", () => {
    const { unmount } = render(<RunGroupPanel />);
    expect(screen.queryByText(/model photo form/)).not.toBeInTheDocument();
    unmount();

    showCanvas(person);
    render(<RunGroupPanel />);

    expect(screen.getByText("model photo form for p")).toBeInTheDocument();
  });

  it("names the design that cannot be rendered and why", () => {
    const blocked = group();
    blocked.targets[0].resolveError = "Scene 1 shows a person, and this design has no approved model photo.";
    mocks.group = blocked;
    render(<RunGroupPanel />);

    expect(screen.getAllByText(/no approved model photo/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
