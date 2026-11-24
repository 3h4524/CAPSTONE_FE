"use client";

import { useGroupPrintify } from "@/hooks/queries/use-group-printify";
import { useGroupStepProgress } from "@/hooks/queries/use-group-step-progress";
import { useGroupVideoProgress } from "@/hooks/queries/use-group-video-progress";
import { useListingLive } from "@/hooks/use-listing-live";
import type { WorkflowNodeData } from "@/types/workflow";

export const useNodeRunStatus = (data: WorkflowNodeData) => {
  const groupProgress = useGroupVideoProgress();
  const printifyProgress = useGroupPrintify();
  const stepProgress = useGroupStepProgress(data.type);
  const listingLive = useListingLive();
  const listingStreaming = data.type === "generate-listing" && listingLive && data.status === "idle";
  // While a batch video run makes its videos, Generate Video reports the batch: one video's run is only a share.
  const batch = data.type === "generate-video" ? groupProgress : null;
  // Push to Printify runs beside the videos of a batch: it shows its own steps, never the render.
  const printifyBatch = data.type === "publish-printify" ? printifyProgress : null;
  // A step of a batch (Generate Video, Review Video, Export ZIP) reports its own checkpoints across the videos.
  const status =
    stepProgress?.status ?? (batch?.active || listingStreaming ? "running" : (printifyBatch?.status ?? data.status));
  const progress = Math.max(
    0,
    Math.min(100, stepProgress?.progress ?? (batch ? batch.progress : printifyBatch ? 0 : (data.progress ?? 0)))
  );
  return { status, progress, listingLive };
};
