"use client";

import { RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { VideoReviewPanel } from "@/components/workflows/media/video-review-panel";
import { GroupVideoList } from "@/components/workflows/run/group-video-list";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { cn } from "@/utils/cn";

/**
 * What Review Video shows of the open run: its status, every design's video when a batch video run is open, and the
 * video being reviewed. The Results tab of the step with a run open, and below its settings without one.
 */
export const ReviewVideoResults = ({ className }: { className?: string }) => {
  const groupId = useRunGroupId();
  return (
    <div className={cn("space-y-4", className)}>
      <RunStatusPanel />
      {/* A batch video run lists every design's video; the one chosen is reviewed just below. */}
      {groupId && <GroupVideoList />}
      <VideoReviewPanel />
    </div>
  );
};
