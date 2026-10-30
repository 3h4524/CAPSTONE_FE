"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Film } from "lucide-react";

import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowStore } from "@/stores/workflow";

export const VideoNodePreview = () => {
  // Both hooks are always called: `??` would skip the second one while the URL has a run, and React fails when it comes back.
  const urlRunId = useSearchParams().get("run");
  const storedRunId = useWorkflowStore((state) => state.videoRunId);
  const runId = urlRunId ?? storedRunId;
  const { data: videos } = useRunVideos(runId);
  const video = videos?.[0];

  if (video?.thumbnailUrl) {
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-sm">
        <Image
          src={video.thumbnailUrl}
          alt={`Latest video, version ${video.version}`}
          fill
          unoptimized
          className="object-contain"
        />
        <span className="bg-wf-surface/90 text-wf-dim absolute right-1 bottom-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-wide tabular-nums">
          v{video.version} · {video.status}
        </span>
      </div>
    );
  }

  return (
    <div className="border-wf-line flex aspect-[2/1] w-full items-center gap-1.5 border border-dashed px-2.5">
      <Film className="text-wf-faint size-3.5 shrink-0" aria-hidden="true" />
      <span className="text-wf-faint text-[10px] font-medium tracking-[0.08em] uppercase">
        Preview after render
      </span>
      <span className="bg-wf-line h-px flex-1" aria-hidden="true" />
    </div>
  );
};
