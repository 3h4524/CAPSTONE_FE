"use client";

import { useTranslation } from "react-i18next";

import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString, readStringArray } from "@/helpers/workflow-config";
import { usePreviewVideoStoryboard } from "@/hooks/mutations/use-preview-video-storyboard";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { generateVideoConfigSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig, WorkflowRun } from "@/types/video-workflow";

/** Video statuses whose version can still be decided on at Review Video (see the review panel). */
const REVIEWABLE_VIDEO_STATUSES = ["completed", "ready", "rendering"];

/** The video the open run waits on at Review Video, when it waits on one. */
export const videoUnderReview = <T extends { id: string; status: string }>(run: WorkflowRun | undefined, videos: T[] | undefined) => {
  if (run?.status !== "waiting_for_review") return undefined;
  const candidateId = run.nodes.find((node) => node.nodeType === "review-video")?.output.videoId;
  const video = videos?.find((item) => item.id === candidateId);
  return video && REVIEWABLE_VIDEO_STATUSES.includes(video.status) ? video : undefined;
};

/**
 * Applies an edit of the full video (cuts, transitions, text, music...) to the video the open run waits on at Review
 * Video. The run plans that video again with the edit, reusing the AI clips it has already stored, so the version then
 * approved, and the file Export ZIP packs, is the edited one.
 *
 * Saving the edit on the canvas alone only changes the workflow's settings for its next run: the video waiting for
 * review keeps the plan it was made with, and approving it renders that plan.
 */
export const useApplyVideoEdit = () => {
  const { t } = useTranslation("common");
  const { run } = useWorkflowRuntime();
  const { data: videos } = useRunVideos(run?.id ?? null);
  const mockup = useWorkflowStore((state) => state.nodes.find((node) => node.data.type === "apply-mockup"));
  // Both report their own failure once, below, instead of the default toast as well.
  const { mutateAsync: previewStoryboard, isPending: isPreviewing } = usePreviewVideoStoryboard(true);
  const { mutateAsync: act, isPending: isActing } = useWorkflowRunAction();
  const candidate = videoUnderReview(run, videos);

  /** True when the edit reached the run; false when it was declined, invalid, or failed (the seller is told why). */
  const apply = async (config: GenerateVideoConfig): Promise<boolean> => {
    if (!run || !candidate) return false;
    const parsed = generateVideoConfigSchema.safeParse(config);
    if (!parsed.success) {
      showToast("warning", parsed.error.issues[0]?.message ?? t("workflowMedia.runStatus.checkVideoSettings"));
      return false;
    }
    try {
      // A design's run of a batch video run is edited with the canvas settings, whose scenes name the images of the product
      // they were set up on ("Chosen on another design"). The server moves them onto this design's own images, as it does
      // for the rerender below, but only when the preview says it is for a design: without it the preview refuses the
      // scene with "source is not an approved mockup".
      const forDesign = Boolean(run.runGroupId);
      const storyboard = await previewStoryboard({
        productId: run.productId,
        config: parsed.data,
        mockupIds: forDesign ? [] : candidate.mockupIds ?? readStringArray(mockup?.data.config.mockupIds),
        artworkGroupKey: candidate.artworkGroupKey ?? run.artworkGroupKey ?? readString(mockup?.data.config.artworkGroupKey),
        forDesign,
      });
      // Clips the run has stored are not asked about again: only an edit that needs new ones has a cost to confirm.
      const token = await confirmAiShot(run.id, parsed.data);
      if (token === null) return false;
      await act(
        {
          runId: run.id,
          expectedRevision: run.revision,
          action: "rerender",
          config: parsed.data,
          // The run plans a design's video with the settings the seller gave that design too, which the preview does not
          // know: its fingerprint could differ without the video having changed, so a design's run plans afresh instead.
          expectedStoryboardFingerprint: forDesign ? undefined : storyboard.fingerprint,
          aiShotQuoteToken: token,
        },
        { onError: () => {} }
      );
      return true;
    } catch (error) {
      showToast("error", getErrorMessage(error));
      return false;
    }
  };

  return { canApply: Boolean(candidate), candidate, apply, isApplying: isPreviewing || isActing };
};
