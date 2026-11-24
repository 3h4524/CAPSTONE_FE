import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunGroupPanel } from "@/components/workflows/run/run-group-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { buildMockupTemplate, buildWorkflowNode } from "@/test/factories";
import type { GenerateVideoConfig, MockupAsset, RunGroup } from "@/types/video-workflow";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  confirm: vi.fn(),
  resume: vi.fn(),
  assets: [] as MockupAsset[],
  printWithoutAi: true,
  reviewDesign: vi.fn(),
  templates: [] as unknown[],
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
vi.mock("@/hooks/queries/use-mockup-templates", () => ({ useMockupTemplates: () => ({ data: mocks.templates }) }));
vi.mock("@/hooks/mutations/use-review-design-mockups", () => ({ useReviewDesignMockups: () => ({ mutateAsync: mocks.reviewDesign }) }));
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

  it("says the model photos are being made, and keeps Continue off until they are", () => {
    const preparing = group();
    preparing.preparing = true;
    mocks.group = preparing;
    render(<RunGroupPanel />);

    expect(screen.getByText(/Getting the videos ready/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
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

describe("RunGroupPanel: reviewing a product", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showCanvas(standard);
    mocks.group = group();
    mocks.templates = [];
  });

  const hoodie = (status = "approved") => {
    mocks.templates = [
      buildMockupTemplate({
        id: "hoodie",
        name: "Pullover hoodie",
        productType: "hoodie",
        views: [buildMockupTemplate({ id: "hoodie-back", printAreaConfig: '{"x":10,"y":10,"width":180,"height":180,"view":"back","mainTemplateId":"hoodie"}' })],
      }),
    ];
    const made = (id: string, templateId: string, color: string) =>
      ({ ...mockup(id, status), sourceType: "generated", mockupTemplateId: templateId, variantKey: color }) as MockupAsset;
    mocks.assets = [
      made("white-back", "hoodie-back", "#FFFFFF"),
      made("white-front", "hoodie", "#FFFFFF"),
      made("black-back", "hoodie-back", "#1A1A1A"),
      made("black-front", "hoodie", "#1A1A1A"),
    ];
  };

  it("shows the product as one card, its colors and sides picked on it as on Apply mock-up", async () => {
    hoodie();
    render(<RunGroupPanel />);

    const strip = screen.getByRole("list", { name: "Mock-ups of June Rose Tee" });
    expect(within(strip).getAllByRole("listitem")).toHaveLength(1);
    expect(within(strip).getByText("Pullover hoodie")).toBeInTheDocument();
    expect(within(strip).getByRole("img", { name: /pullover hoodie \(front\)/i })).toHaveAttribute("src", "https://cdn.test/white-front.png");

    await userEvent.click(within(strip).getByRole("tab", { name: "Back" }));
    await userEvent.click(within(strip).getByRole("tab", { name: "Show in Black" }));

    expect(within(strip).getByRole("img", { name: /pullover hoodie \(back\)/i })).toHaveAttribute("src", "https://cdn.test/black-back.png");
  });

  it("leaves a color out with every side of it, and keeps the last color on", async () => {
    hoodie("pending");
    render(<RunGroupPanel />);
    const strip = screen.getByRole("list", { name: "Mock-ups of June Rose Tee" });

    await userEvent.click(within(strip).getByRole("tab", { name: "Show in Black" }));
    await userEvent.click(within(strip).getByRole("checkbox", { name: "Sell in Black" }));
    expect(within(strip).getByText("Left out")).toBeInTheDocument();
    await userEvent.click(within(strip).getByRole("tab", { name: "Show in White" }));
    expect(within(strip).getByRole("checkbox", { name: "Sell in White" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Approve product" }));

    expect(mocks.reviewDesign).toHaveBeenCalledWith({
      productId: "p",
      artworkGroupKey: "d",
      approved: true,
      leftOut: ["black-front", "black-back"],
    });
  });

  it("approves every color and side of the product at once, and leaves AI photos to their own review", async () => {
    mocks.assets = [
      { ...mockup("front", "pending"), sourceType: "generated" },
      { ...mockup("back", "pending"), sourceType: "generated" },
      { ...mockup("lifestyle", "pending"), sourceType: "uploaded", role: "Lifestyle" },
    ] as MockupAsset[];
    render(<RunGroupPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Approve product" }));

    expect(mocks.reviewDesign).toHaveBeenCalledTimes(1);
    expect(mocks.reviewDesign).toHaveBeenCalledWith({ productId: "p", artworkGroupKey: "d", approved: true, leftOut: [] });
    expect(screen.getAllByRole("button", { name: "Approve mock-up" })).toHaveLength(1);
  });
});

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
