import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApplyVideoEdit, videoUnderReview } from "@/hooks/use-apply-video-edit";
import type { GenerateVideoConfig, WorkflowRun } from "@/types/video-workflow";
import { act, renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  run: undefined as WorkflowRun | undefined,
  videos: [] as { id: string; status: string; mockupIds?: string[]; artworkGroupKey?: string | null }[],
  preview: vi.fn(),
  act: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: mocks.run }) }));
vi.mock("@/hooks/queries/use-run-videos", () => ({ useRunVideos: () => ({ data: mocks.videos }) }));
vi.mock("@/hooks/mutations/use-preview-video-storyboard", () => ({
  usePreviewVideoStoryboard: () => ({ mutateAsync: mocks.preview, isPending: false }),
}));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({
  useWorkflowRunAction: () => ({ mutateAsync: mocks.act, isPending: false }),
}));
vi.mock("@/helpers/confirm-ai-shot", () => ({ confirmAiShot: mocks.confirm }));
vi.mock("@/helpers/toast", () => ({ showToast: mocks.toast }));

const edited = {
  mode: "ai_shot",
  durationSeconds: 10,
  aiScenes: [{ mode: "standard", durationSeconds: 5 }, { mode: "standard", durationSeconds: 5 }],
  videoEdit: { overlays: [], transitions: [{ afterScene: 0, type: "fade", frames: 12 }] },
} as unknown as GenerateVideoConfig;

const waitingRun = (videoId = "v2"): WorkflowRun => ({
  id: "run-1", workflowId: "wf", productId: "p", status: "waiting_for_review", revision: 7, workflowRevision: 1,
  createdAt: "", errorMessage: null,
  nodes: [{ nodeType: "review-video", output: { videoId } }] as unknown as WorkflowRun["nodes"],
});

vi.mock("@/schemas/workflow", () => ({
  generateVideoConfigSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
}));

describe("videoUnderReview", () => {
  it("is the version Review Video waits on, not an older one", () => {
    const videos = [{ id: "v2", status: "ready" }, { id: "v1", status: "completed" }];
    expect(videoUnderReview(waitingRun("v2"), videos)?.id).toBe("v2");
  });

  it("is none while the run is not waiting for review", () => {
    expect(videoUnderReview({ ...waitingRun(), status: "running" }, [{ id: "v2", status: "ready" }])).toBeUndefined();
  });
});

describe("useApplyVideoEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.run = waitingRun();
    mocks.videos = [{ id: "v2", status: "ready", mockupIds: ["m1", "m2"], artworkGroupKey: "design-1" }];
    mocks.preview.mockResolvedValue({ fingerprint: "fp-edited" });
    mocks.confirm.mockResolvedValue("");
    mocks.act.mockResolvedValue({});
  });

  it("sends the edit to the video waiting for review, so the approved version is the edited one", async () => {
    const { result } = renderHook(() => useApplyVideoEdit());
    expect(result.current.canApply).toBe(true);

    let applied = false;
    await act(async () => { applied = await result.current.apply(edited); });

    expect(applied).toBe(true);
    expect(mocks.preview).toHaveBeenCalledWith({ productId: "p", config: edited, mockupIds: ["m1", "m2"], artworkGroupKey: "design-1", forDesign: false });
    expect(mocks.act).toHaveBeenCalledWith(
      { runId: "run-1", expectedRevision: 7, action: "rerender", config: edited, expectedStoryboardFingerprint: "fp-edited", aiShotQuoteToken: "" },
      expect.anything()
    );
  });

  it("previews a design's run of a batch for that design, so its scenes take the design's own images", async () => {
    mocks.run = { ...waitingRun(), runGroupId: "group-1", artworkGroupKey: "design-9" };
    mocks.videos = [{ id: "v2", status: "ready", mockupIds: ["canvas-1"], artworkGroupKey: null }];
    const { result } = renderHook(() => useApplyVideoEdit());

    let applied = false;
    await act(async () => { applied = await result.current.apply(edited); });

    expect(applied).toBe(true);
    // The canvas names the images of the preview product ("Chosen on another design"): the server moves them onto this design.
    expect(mocks.preview).toHaveBeenCalledWith({ productId: "p", config: edited, mockupIds: [], artworkGroupKey: "design-9", forDesign: true });
    // The design's run plans with the settings given to that design too, so it plans afresh instead of checking a preview's fingerprint.
    expect(mocks.act).toHaveBeenCalledWith(
      { runId: "run-1", expectedRevision: 7, action: "rerender", config: edited, expectedStoryboardFingerprint: undefined, aiShotQuoteToken: "" },
      expect.anything()
    );
  });

  it("sends nothing when the seller declines new AI clips the edit would need", async () => {
    mocks.confirm.mockResolvedValue(null);
    const { result } = renderHook(() => useApplyVideoEdit());

    let applied = true;
    await act(async () => { applied = await result.current.apply(edited); });

    expect(applied).toBe(false);
    expect(mocks.act).not.toHaveBeenCalled();
  });

  it("does nothing when no video waits for review", async () => {
    mocks.run = { ...waitingRun(), status: "completed" };
    const { result } = renderHook(() => useApplyVideoEdit());

    expect(result.current.canApply).toBe(false);
    await act(async () => { await result.current.apply(edited); });
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("tells the seller once when the edit could not be applied", async () => {
    mocks.act.mockRejectedValue(new Error("Storyboard changed. Preview again before rendering."));
    const { result } = renderHook(() => useApplyVideoEdit());

    let applied = true;
    await act(async () => { applied = await result.current.apply(edited); });

    expect(applied).toBe(false);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith("error", "Storyboard changed. Preview again before rendering.");
  });
});
