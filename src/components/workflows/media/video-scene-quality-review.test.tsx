import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoSceneQualityReview } from "@/components/workflows/media/video-scene-quality-review";
import type { PromoVideo, VideoSceneQuality } from "@/types/video-workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { getVideoSceneQuality, evaluateVideoScene, reviseVideoExperience, saveVideoSceneReview, setVideoExperienceStatus } = vi.hoisted(() => ({
  getVideoSceneQuality: vi.fn(),
  evaluateVideoScene: vi.fn(),
  reviseVideoExperience: vi.fn(),
  saveVideoSceneReview: vi.fn(),
  setVideoExperienceStatus: vi.fn(),
}));

vi.mock("@/api/video-workflow", () => ({
  getVideoSceneQuality,
  evaluateVideoScene,
  reviseVideoExperience,
  saveVideoSceneReview,
  setVideoExperienceStatus,
  videoWorkflowKeys: { sceneQuality: (runId: string, videoId: string, sceneOrder: number) => ["quality", runId, videoId, sceneOrder] },
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
const renderPanel = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VideoSceneQualityReview runId="run-1" video={video} /></QueryClientProvider>);

describe("VideoSceneQualityReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVideoSceneQuality.mockResolvedValue(quality());
    evaluateVideoScene.mockResolvedValue(quality());
    saveVideoSceneReview.mockResolvedValue(quality());
    setVideoExperienceStatus.mockResolvedValue({ lessonId: "lesson-1", status: "verified", revision: "1", content: "Lesson" });
    reviseVideoExperience.mockResolvedValue(quality());
  });

  it("submits a timestamped confirmed observation without creating a paid video", async () => {
    const user = userEvent.setup();
    renderPanel();
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
