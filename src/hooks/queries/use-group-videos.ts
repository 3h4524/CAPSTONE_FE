"use client";

import { listRunVideos, videoWorkflowKeys } from "@/api/video-workflow";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { PromoVideo, RunGroup, RunGroupTarget } from "@/types/video-workflow";
import { useQueries } from "@tanstack/react-query";

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
  const made = targets.filter((target) => WITH_VIDEO.has(target.runStatus ?? ""));
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
 * Where one design's video is, in the words the review uses. An approved video goes on to Export ZIP, and its run is
 * running again meanwhile: it is still approved, not being made.
 */
export const groupVideoState = (target: Pick<RunGroupTarget, "runStatus" | "currentStep">): GroupVideoState => {
  const status = target.runStatus ?? "";
  if (status === "completed" || (status === "running" && target.currentStep === "export-zip")) return "approved";
  if (status === "waiting_for_review") return "review";
  if (STOPPED.has(status)) return "stopped";
  return status === "queued" ? "queued" : "processing";
};
