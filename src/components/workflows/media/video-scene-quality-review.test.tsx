import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoSceneQualityReview } from "@/components/workflows/media/video-scene-quality-review";
import type { PromoVideo, VideoSceneQuality } from "@/types/video-workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { getVideoQualitySummary, getVideoSceneQuality, evaluateVideoScene, reviseVideoExperience, saveVideoSceneReview, setVideoExperienceStatus } = vi.hoisted(() => ({
  getVideoQualitySummary: vi.fn(),
  getVideoSceneQuality: vi.fn(),
  evaluateVideoScene: vi.fn(),
  reviseVideoExperience: vi.fn(),
  saveVideoSceneReview: vi.fn(),
  setVideoExperienceStatus: vi.fn(),
}));

vi.mock("@/api/video-workflow", () => ({
  getVideoQualitySummary,
  getVideoSceneQuality,
  evaluateVideoScene,
  reviseVideoExperience,
  saveVideoSceneReview,
  setVideoExperienceStatus,
  videoWorkflowKeys: {
    sceneQuality: (runId: string, videoId: string, sceneOrder: number) => ["quality", runId, videoId, sceneOrder],
    videoQualitySummary: (runId: string, videoId: string) => ["quality-summary", runId, videoId],
  },
}));
vi.mock("@/helpers/toast", () => ({ showToast: vi.fn() }));

const video: PromoVideo = {
  id: "video-1", runId: "run-1", mode: "ai_shot", template: "product_showcase", version: 1,
  reviewRevision: 1, status: "completed", approvalStatus: "pending", previewUrl: null, thumbnailUrl: null, qa: {},
  outputFormat: "portrait", width: 1080, height: 1920, aspectRatio: "9:16",
  scenes: [{ mockupId: "source-1", sourceRevision: 1, sourceHash: "hash", role: "Lifestyle", sceneOrder: 0,
    durationFrames: 120, crop: { x: 0, y: 0, width: 1, height: 1 }, endCrop: { x: 0, y: 0, width: 1, height: 1 },
    motion: "static", transition: "none", text: "", generationStrategy: "ai_shot", warnings: [], aiTemplateCode: "lifestyle_in_use",
    aiPromptTrace: { ruleVersion: 1, ragStatus: "applied", appliedRules: [], warnings: [], parts: [], finalPrompt: "prompt" } }],
};

const quality = (reviews: VideoSceneQuality["reviews"] = []): VideoSceneQuality => ({ videoId: video.id, sceneOrder: 0, evaluation: null, reviews });
const renderPanel = (showObservationForm = false) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VideoSceneQualityReview runId="run-1" video={video} showObservationForm={showObservationForm} /></QueryClientProvider>);

describe("VideoSceneQualityReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVideoQualitySummary.mockResolvedValue({ videoId: video.id, status: "completed", technical: {}, etsyCompliance: null, scenes: [] });
    getVideoSceneQuality.mockResolvedValue(quality());
    evaluateVideoScene.mockResolvedValue(quality());
    saveVideoSceneReview.mockResolvedValue(quality());
    setVideoExperienceStatus.mockResolvedValue({ lessonId: "lesson-1", status: "verified", revision: "1", content: "Lesson" });
    reviseVideoExperience.mockResolvedValue(quality());
  });

  it("shows final video details and every saved Etsy check", async () => {
    getVideoQualitySummary.mockResolvedValue({
      videoId: video.id, status: "warning", scenes: [],
      technical: { durationSeconds: 12, width: 1080, height: 1920, fps: 30, codec: "h264", pixelFormat: "yuv420p", bytes: 2097152, hasAudio: false, fullDecode: true },
      etsyCompliance: { status: "pass_with_warning", checks: [
        { key: "duration", status: "pass", detail: "12 seconds; policy is 5–15 seconds." },
        { key: "aspectRatio", status: "warning", detail: "The output may be cropped." },
      ] },
    });
    renderPanel();
    expect(await screen.findByText("Final video quality")).toBeInTheDocument();
    expect(screen.getByText("1080 × 1920")).toBeInTheDocument();
    expect(screen.getByText("2.00 MB")).toBeInTheDocument();
    expect(screen.getByText("12 seconds; policy is 5–15 seconds.")).toBeInTheDocument();
    expect(screen.getByText("The output may be cropped.")).toBeInTheDocument();
  });

  it("leaves the audio check out and counts the rest", async () => {
    getVideoQualitySummary.mockResolvedValue({
      videoId: video.id, status: "warning", scenes: [], technical: { fullDecode: true },
      etsyCompliance: { status: "pass_with_warning", checks: [
        { key: "duration", status: "pass", detail: "5 seconds; policy is 5–15 seconds." },
        { key: "format", status: "pass", detail: "MP4 is an accepted listing video format." },
        { key: "aspectRatio", status: "warning", detail: "The output may be cropped." },
        { key: "audio", status: "info", detail: "No audio track is present." },
      ] },
    });
    renderPanel();
    expect(await screen.findByText("Aspect ratio")).toBeInTheDocument();
    expect(screen.queryByText("No audio track is present.")).not.toBeInTheDocument();
    expect(screen.getByText(/2 passed/)).toBeInTheDocument();
    expect(screen.getByText("1 to review")).toBeInTheDocument();
  });

  it("explains missing Etsy data and displays scene measurements without pass thresholds", async () => {
    getVideoSceneQuality.mockResolvedValue({ ...quality(), evaluation: {
      status: "completed", evaluatedAtUtc: null, evaluatorVersion: "v1",
      metrics: { vbench: { subject_consistencyScore: 0.9535, dimensions: {} }, paddleOcr: { status: "skipped", reason: "No text detected." } }, detail: null,
    } });
    const user = userEvent.setup();
    renderPanel();
    expect(await screen.findByText(/No Etsy result was saved/)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /View details/ }));
    expect(await screen.findByText("0.9535")).toBeInTheDocument();
    expect(screen.getByText("No text detected.")).toBeInTheDocument();
    expect(screen.getByText(/These are uncalibrated guides/)).toBeInTheDocument();
    expect(screen.getByText("High · guide")).toBeInTheDocument();
  });

  it("shows unavailable policy as review needed even when the scene is scored", async () => {
    getVideoQualitySummary.mockResolvedValue({ videoId: video.id, status: "pass", technical: { codec: "h264", fullDecode: true }, etsyCompliance: null, scenes: [{ sceneOrder: 0, status: "completed", detail: null, metrics: {} }] });
    renderPanel();
    expect(await screen.findByText("Needs review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Scene 1.*Scored/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Not checked")).toBeInTheDocument();
  });

  it("shows a failed policy check as an overall failure", async () => {
    getVideoQualitySummary.mockResolvedValue({ videoId: video.id, status: "fail", technical: { fullDecode: true }, scenes: [], etsyCompliance: { status: "fail", checks: [{ key: "duration", status: "fail", detail: "Duration is outside the allowed range." }] } });
    renderPanel();
    expect(await screen.findByText("The final video has a failed technical or Etsy check.")).toBeInTheDocument();
    expect(screen.getByText("Duration is outside the allowed range.")).toBeInTheDocument();
  });

  it("lets the user select a failed scene without presenting the evaluation error as a video failure", async () => {
    getVideoQualitySummary.mockResolvedValue({
      videoId: video.id, status: "warning", technical: { fullDecode: true },
      etsyCompliance: { status: "pass", checks: [] },
      scenes: [{ sceneOrder: 0, status: "completed", detail: null, metrics: {} }, { sceneOrder: 1, status: "failed", detail: "Evaluation failed", metrics: {} }],
    });
    const videoWithTwoScenes: PromoVideo = { ...video, scenes: [...video.scenes, { ...video.scenes[0], sceneOrder: 1 }] };
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VideoSceneQualityReview runId="run-1" video={videoWithTwoScenes} /></QueryClientProvider>);
    expect(await screen.findByText("Needs review")).toBeInTheDocument();
    const secondScene = screen.getByRole("button", { name: /Scene 2.*Check failed/ });
    await user.click(secondScene);
    expect(secondScene).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(getVideoSceneQuality).toHaveBeenCalledWith({ runId: "run-1", videoId: "video-1", sceneOrder: 1 }));
  });

  it("submits a timestamped confirmed observation without creating a paid video", async () => {
    const user = userEvent.setup();
    renderPanel(true);
    await screen.findByRole("button", { name: "Save observation" });

    fireEvent.change(screen.getByLabelText("Start (seconds)"), { target: { value: "2.3" } });
    fireEvent.change(screen.getByLabelText("End (seconds)"), { target: { value: "2.8" } });
    fireEvent.change(screen.getByLabelText("Observation"), { target: { value: "The hand jerks while touching the collar." } });
    await user.click(screen.getByLabelText("Confirm the system suggestion after saving"));
    await user.click(screen.getByRole("button", { name: "Save observation" }));

    await waitFor(() => expect(saveVideoSceneReview).toHaveBeenCalledWith(expect.objectContaining({
      runId: "run-1", videoId: "video-1", sceneOrder: 0, startMilliseconds: 2300, endMilliseconds: 2800,
      category: "hands", confirmSuggestion: true, suspectRagExperience: false,
    }), expect.anything()));
    expect(evaluateVideoScene).not.toHaveBeenCalled();
  });

  it("hides the observation form by default while retaining scene evaluations", async () => {
    renderPanel();

    expect(await screen.findByText("Scene evaluations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run again/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Start (seconds)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Observation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Candidate lesson for RAG (optional)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save observation" })).not.toBeInTheDocument();
  });

  it("shows a saved suggestion and sends an explicit verification decision for its lesson", async () => {
    getVideoSceneQuality.mockResolvedValue(quality([{
      id: "review-1", startMilliseconds: 2300, endMilliseconds: 2800, category: "hands", severity: "high",
      presentInSourceImage: false, description: "Hand jerks.", status: "confirmed",
      suggestion: { target: "prompt_template", reason: "Lifestyle action", confidence: "medium" },
      confirmedTarget: "prompt_template", lessonId: "lesson-1", lessonStatus: "candidate", lessonRevision: "1", lessonContent: "Keep one slow hand path.",
      createdAtUtc: "2026-10-30T00:00:00Z", updatedAtUtc: "2026-10-30T00:00:00Z",
    }]));
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Hand jerks.");

    await user.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(setVideoExperienceStatus).toHaveBeenCalledWith({ lessonId: "lesson-1", status: "verified" }, expect.anything()));
    expect(screen.getByText(/Suggestion:/)).toHaveTextContent("Prompt Template");
  });

  it("shows lesson content before verification and creates a separate candidate revision", async () => {
    getVideoSceneQuality.mockResolvedValue(quality([{
      id: "review-1", startMilliseconds: 2300, endMilliseconds: 2800, category: "hands", severity: "high",
      presentInSourceImage: false, description: "Hand jerks.", status: "confirmed",
      suggestion: { target: "prompt_template", reason: "Lifestyle action", confidence: "medium" },
      confirmedTarget: "prompt_template", lessonId: "lesson-1", lessonStatus: "candidate", lessonRevision: "1", lessonContent: "Keep one slow hand path.",
      createdAtUtc: "2026-10-30T00:00:00Z", updatedAtUtc: "2026-10-30T00:00:00Z",
    }]));
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Lesson revision 1/);
    expect(screen.getAllByText(/Keep one slow hand path/)).toHaveLength(2);

    const revisionInput = screen.getByLabelText("Revision for lesson lesson-1");
    fireEvent.change(revisionInput, { target: { value: "Keep the hand path slow and preserve anatomy." } });
    await user.click(screen.getByRole("button", { name: "Create revised candidate" }));

    await waitFor(() => expect(reviseVideoExperience).toHaveBeenCalledWith({
      runId: "run-1", videoId: "video-1", sceneOrder: 0, lessonId: "lesson-1", reviewId: "review-1",
      content: "Keep the hand path slow and preserve anatomy.",
    }, expect.anything()));
  });
});
