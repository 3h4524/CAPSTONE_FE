"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useTranslation } from "react-i18next";

import { videoPosterUrl } from "@/helpers/video-poster";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useVideoRunId } from "@/hooks/use-video-run-id";

export const VideoNodePreview = () => {
  const { t } = useTranslation("common");
  const { data: videos } = useRunVideos(useVideoRunId());
  const video = videos?.[0];

  // A video without a file yet shows its first scene: the mock-up the video starts from.
  const poster = videoPosterUrl(video);
  if (video && poster) {
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-sm">
        <Image
          src={poster}
          alt={t("workflowEditor.videoPreview.alt", { version: video.version })}
          fill
          unoptimized
          className="object-contain"
        />
        <span className="bg-wf-surface/90 text-wf-dim absolute right-1 bottom-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-wide tabular-nums">
          v{video.version} ·{" "}
          {t(`workflowEditor.runGroup.runStatuses.${video.status}`, { defaultValue: video.status })}
        </span>
      </div>
    );
  }

  return (
    <div className="border-wf-line flex aspect-[2/1] w-full items-center gap-1.5 border border-dashed px-2.5">
      <Film className="text-wf-faint size-3.5 shrink-0" aria-hidden="true" />
      <span className="text-wf-faint text-[10px] font-medium tracking-[0.08em] uppercase">
        {t("workflowEditor.videoPreview.afterRender")}
      </span>
      <span className="bg-wf-line h-px flex-1" aria-hidden="true" />
    </div>
  );
};
