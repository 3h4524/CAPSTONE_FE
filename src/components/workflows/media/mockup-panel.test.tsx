import { beforeEach, describe, expect, it, vi } from "vitest";

import { MockupPanel } from "@/components/workflows/media/mockup-panel";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => {
  const store = { nodes: [] as { id: string; data: { type: string; config: Record<string, unknown> } }[], updateNodeConfig: vi.fn() };
  const useWorkflowStore = Object.assign(
    (selector: (state: typeof store) => unknown) => selector(store),
    { getState: () => store }
  );
  return {
    action: vi.fn(),
    confirmAiShot: vi.fn(),
    previewStoryboard: vi.fn(),
    showToast: vi.fn(),
    store,
    useWorkflowStore,
  };
});

vi.mock("@/components/workflows/media/lifestyle-mockup-form", () => ({ LifestyleMockupForm: () => null }));
vi.mock("@/components/workflows/media/mockup-card", () => ({ MockupCard: () => null }));
vi.mock("@/components/workflows/media/mockup-upload-form", () => ({ MockupUploadForm: () => null }));
vi.mock("@/helpers/confirm-ai-shot", () => ({ confirmAiShot: mocks.confirmAiShot }));
vi.mock("@/helpers/error-message", () => ({ getErrorMessage: () => "Request failed" }));
vi.mock("@/helpers/toast", () => ({ showToast: mocks.showToast }));
vi.mock("@/hooks/mutations/use-preview-video-storyboard", () => ({
  usePreviewVideoStoryboard: () => ({ mutateAsync: mocks.previewStoryboard, isPending: false }),
}));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({
  useWorkflowRunAction: () => ({ mutateAsync: mocks.action, isPending: false }),
}));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({
  useMockupAssets: () => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({
  useWorkflowRuntime: () => ({ run: { id: "run-1", productId: "product-1", revision: 4, status: "waiting_for_input" }, isRunning: false }),
}));
vi.mock("@/stores/workflow", () => ({ useWorkflowStore: mocks.useWorkflowStore }));

const mockupId = "11111111-1111-4111-8111-111111111111";
const videoConfig = {
  mode: "ai_shot",
  target: "etsy",
  template: "auto",
  outputFormat: "portrait",
  durationSeconds: 4,
  assetSelection: "automatic",
  selectedMockupIds: [],
  sceneOrder: [],
  textOverlay: "",
  standardOptions: { motionPreset: "varied", crop: "safe", transition: "fade" },
  fallbackToStandard: false,
  aiScenes: [{ mode: "ai", mockupId, templateCode: "cinematic_product_showcase", durationSeconds: 4, framing: "medium", cameraAngle: "three_quarter", cameraMovement: "push_in", subjectMotion: "none", motionIntensity: "subtle", lighting: "soft_studio", extraInstructions: null, rightsConfirmed: false }],
  aiStudioMode: "direct",
  aiStudioLayout: "hanging_window",
  videoEdit: { version: 1, music: null, overlays: [] },
};

const trace = {
  ruleVersion: 1,
  ragStatus: "disabled",
  appliedRules: ["p1-start-action-end"],
  warnings: [],
  parts: [
    { key: "template", label: "Template prompt", content: "Template direction", includedInFinalPrompt: true },
    { key: "rag", label: "RAG experience", content: "Disabled: no retrieved experience was added to this prompt.", includedInFinalPrompt: false },
  ],
  finalPrompt: "Template direction",
};

describe("MockupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store.nodes = [
      { id: "product", data: { type: "product-input", config: { productId: "product-1" } } },
      { id: "mockup", data: { type: "apply-mockup", config: { mockupIds: [mockupId], artworkGroupKey: "group-1" } } },
      { id: "video", data: { type: "generate-video", config: videoConfig } },
    ];
    mocks.previewStoryboard.mockResolvedValue({ fingerprint: "preview-fingerprint", scenes: [{ sceneOrder: 0, aiPromptTrace: trace }] });
    mocks.confirmAiShot.mockResolvedValue("quote-token");
    mocks.action.mockResolvedValue({});
  });

  it("reviews the safe storyboard before quoting or resuming a paid AI request", async () => {
    const user = userEvent.setup();
    render(<MockupPanel review />);

    await user.click(screen.getByRole("button", { name: "Review prompt before creating video" }));

    expect(mocks.showToast).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.previewStoryboard).toHaveBeenCalledWith(expect.objectContaining({ productId: "product-1" })));
    expect(mocks.confirmAiShot).not.toHaveBeenCalled();
    expect(mocks.action).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Review AI prompt before paid generation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue to paid confirmation" }));

    await waitFor(() => expect(mocks.confirmAiShot).toHaveBeenCalledWith("run-1", expect.objectContaining({ mode: "ai_shot" }), false, undefined, "preview-fingerprint"));
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith({ runId: "run-1", expectedRevision: 4, action: "resume_mockups", aiShotQuoteToken: "quote-token" }));
  });
});
