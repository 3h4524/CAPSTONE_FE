"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { RUN_PREVIEW_VIDEO_MAX_HEIGHT } from "@/constants/workflow-run-effects";
import { getVideoOutputFormat } from "@/helpers/video-output-formats";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useVideoRunId } from "@/hooks/use-video-run-id";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";

type SingleVideoPreviewProps = {
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

export const SingleVideoPreview = ({ data, status, progress }: SingleVideoPreviewProps) => {
  const { t } = useTranslation("common");
  const { data: videos } = useRunVideos(useVideoRunId());
  const video = status === "running" ? undefined : videos?.[0];
  const format = getVideoOutputFormat(video?.outputFormat ?? data.config.outputFormat);
  const portrait = format.width < format.height;
  const percent = Math.round(progress);

  return (
    <div
      className="bg-wf-muted relative mx-auto max-w-full overflow-hidden rounded-md"
      style={{
        aspectRatio: `${format.width} / ${format.height}`,
        height: portrait ? RUN_PREVIEW_VIDEO_MAX_HEIGHT : undefined,
        width: portrait ? undefined : "100%",
      }}
    >
      {video?.previewUrl ? (
        <video
          src={video.previewUrl}
          poster={video.thumbnailUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className="animate-in fade-in absolute inset-0 size-full object-cover duration-500"
        />
      ) : video?.thumbnailUrl ? (
        <Image
          src={video.thumbnailUrl}
          alt={t("workflowEditor.videoPreview.alt", { version: video.version })}
          fill
          sizes="240px"
          unoptimized
          className="animate-in fade-in object-cover duration-500"
        />
      ) : (
        <>
          <span aria-hidden="true" className="bg-wf-line/70 absolute inset-0 animate-pulse" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
            <span className="text-wf-ink text-lg leading-none font-semibold tabular-nums">{percent}%</span>
            <span className="text-wf-faint line-clamp-2 text-[10px] leading-snug">
              {data.stage ?? t("workflowEditor.videoStrip.processing")}
            </span>
          </span>
          <Progress
            value={percent}
            aria-label={t("workflowEditor.runView.previewVideo")}
            className="bg-wf-line absolute inset-x-0 bottom-0 h-1 rounded-none"
            indicatorClassName="bg-wf-accent"
          />
        </>
      )}
    </div>
  );
};
