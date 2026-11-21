"use client";

import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { PUBLISH_NODE_TYPES } from "@/constants/workflow";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { PromoVideo, RunGroup, RunGroupTarget } from "@/types/video-workflow";
import { useQueries } from "@tanstack/react-query";

/**
 * Where a design's video is: its own status, not its run's. Push to Printify runs beside the video and fails on its
 * own, so a run that failed because of Printify still has a finished video.
 */
export const videoStatusOf = (target: Pick<RunGroupTarget, "runStatus" | "videoStatus">) => target.videoStatus ?? target.runStatus ?? "";

type GenerateFields = Pick<RunGroupTarget, "runStatus" | "videoStatus" | "progress"> &
  Partial<Pick<RunGroupTarget, "generateVideo" | "reviewVideo">>;

/**
 * Where a design's Generate Video step is, on its own: the steps after it (Review Video, Export ZIP, publishing) never
 * make a finished video read as being made again. A made video reads "waiting_for_review" while its review waits for
 * the seller and "completed" otherwise. Older APIs without the step fall back to the video's status.
 */
export const generateStatusOf = (target: GenerateFields): string => {
  const step = target.generateVideo;
  if (!step) return videoStatusOf(target);
  switch (step.status) {
    case "succeeded":
      return target.reviewVideo?.status === "waiting_for_review" ? "waiting_for_review" : "completed";
    case "running":
    case "failed":
    case "cancelled":
    case "waiting_for_input":
      return step.status;
    default: {
      // Not started: still at the steps before it (mock-ups, their approval), or stopped there.
      const status = videoStatusOf(target);
      return STOPPED.has(status) ? status : "queued";
    }
  }
};

/** How far a design's Generate Video step is, 0-100, apart from the steps after it. */
export const generateProgressOf = (target: GenerateFields): number => {
  const step = target.generateVideo;
  if (!step) return target.progress;
  return step.status === "succeeded" ? 100 : step.progress;
};

/** A run in these states has a rendered video to show. */
export const WITH_VIDEO = new Set(["waiting_for_review", "completed"]);
/** A run in these states stopped before its video was finished. */
export const STOPPED = new Set(["failed", "cancelled", "waiting_for_input"]);
/** Signed thumbnail and preview links last ten minutes; a list a few minutes old still shows. */
const VIDEO_LIST_STALE_MS = 4 * 60_000;

export type GroupVideo = {
  target: RunGroupTarget;
  /** The run's latest video, once it has one. */
  video?: PromoVideo;
};

/**
 * The videos of the batch video run open on the canvas, one per design that got a run, with each run's latest
 * rendered video. Shared by the Generate Video and Review Video nodes and panels, so they agree and fetch each list
 * once. Empty without such a run (or before its videos start).
 */
export const useGroupVideos = (): { group: RunGroup | null; videos: GroupVideo[] } => {
  const { data } = useRunGroup(useRunGroupId());
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const group = data && data.workflowId === workflowId ? data : null;
  const targets = group?.targets.filter((target) => target.runId) ?? [];
  const made = targets.filter((target) => target.generateVideo?.status === "succeeded" || WITH_VIDEO.has(videoStatusOf(target)));
  const lists = useQueries({
    queries: made.map((target) => ({
      queryKey: videoWorkflowKeys.videos(target.runId),
      queryFn: () => listRunVideos(target.runId!),
      staleTime: VIDEO_LIST_STALE_MS,
    })),
  });
  const latest = new Map(made.map((target, index) => [target.runId!, lists[index]?.data?.[0]]));
  return { group, videos: targets.map((target) => ({ target, video: latest.get(target.runId!) })) };
};

export type GroupVideoState = "queued" | "processing" | "review" | "approved" | "stopped";

/**
 * Where one design's video is, in the words the review uses. An approved video goes on to Export ZIP or straight to the
 * publish steps, and its run is running again meanwhile: it is still approved, not being made.
 */
const AFTER_VIDEO_STEPS: string[] = ["export-zip", ...PUBLISH_NODE_TYPES];

export type GroupVideoDecision = GroupVideoState | "rejected";

/**
 * Where one design's video is, with the seller's decision on it. In a batch a decision is only recorded until Continue
 * (the run still waits at Review Video), so a decided video reads approved or rejected already; a rejected one stays
 * rejected after Continue, when its product is exported without it.
 */
export const groupVideoDecision = ({ target, video }: GroupVideo): GroupVideoDecision => {
  const state = groupVideoState(target);
  if ((state === "review" || state === "approved") && video?.approvalStatus === "rejected") return "rejected";
  if (state === "review" && video?.approvalStatus === "approved") return "approved";
  return state;
};

/** The video still waits at Review Video: its decision can be made or changed until Continue. */
export const awaitsContinue = (target: Parameters<typeof groupVideoState>[0]) => groupVideoState(target) === "review";

export const groupVideoState = (target: Pick<RunGroupTarget, "runStatus" | "videoStatus" | "currentStep"> & Partial<Pick<RunGroupTarget, "reviewVideo">>): GroupVideoState => {
  const status = videoStatusOf(target);
  if (target.reviewVideo?.status === "succeeded" || status === "completed" || (status === "running" && AFTER_VIDEO_STEPS.includes(target.currentStep ?? ""))) return "approved";
  if (status === "waiting_for_review") return "review";
  if (STOPPED.has(status)) return "stopped";
  return status === "queued" ? "queued" : "processing";
};
