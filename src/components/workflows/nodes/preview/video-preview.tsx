"use client";

import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { ComposedVideoPreview } from "@/components/workflows/media/composed-video-preview";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { SingleVideoPreview } from "@/components/workflows/nodes/preview/single-video-preview";
import { RunGroupVideoStrip } from "@/components/workflows/nodes/run-group-video-strip";
import { previewToneOf } from "@/helpers/workflow-run-view";
import { useGroupVideos } from "@/hooks/queries/use-group-videos";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useVideoRunId } from "@/hooks/use-video-run-id";
import type { GenerateVideoConfig } from "@/types/video-workflow";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";

type VideoPreviewProps = {
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

/**
 * Beside Generate Video while it runs: each AI scene as the provider makes it (a placeholder while it is made, its clip once it
 * is stored), then the whole video once it is made, played as at Review Video. A video with no AI scene, or not made yet, shows
 * the video's progress (the batch's videos in a batch video run).
 */
export const VideoPreview = ({ data, status, progress }: VideoPreviewProps) => {
  const { t } = useTranslation("common");
  const config = data.config as GenerateVideoConfig;
  // In a batch video run, the design open on the canvas, or else the first design with a video.
  const { videos: groupVideos } = useGroupVideos();
  const openRunId = useVideoRunId();
  const design =
    groupVideos.find((item) => item.target.runId === openRunId) ??
    groupVideos.find((item) => item.video) ??
    groupVideos[0];
  const runId = openRunId ?? design?.target.runId ?? null;
  const { data: clips = [] } = useRunSceneVideos(runId);
  const { data: runVideos } = useRunVideos(runId);
  const video = groupVideos.length > 0 ? (design?.video ?? runVideos?.[0]) : runVideos?.[0];
  const running = status === "running";
  const tone = previewToneOf(status);
  const doneLabel =
    tone === "failed"
      ? t("workflowEditor.runView.previewFailed")
      : t("workflowEditor.runView.previewDone");

  // Made: the whole video, its file once rendered, else drawn from its scenes as Review Video does.
  if (!running && video && (video.previewUrl || video.preview))
    return (
      <div className="grid gap-2">
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewVideo")}
          <span className="text-wf-faint tabular-nums">v{video.version}</span>
          <PreviewStatus tone={tone} label={doneLabel} />
        </div>
        {video.previewUrl ? (
          <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={22}>
            <video
              src={video.previewUrl}
              poster={video.thumbnailUrl ?? undefined}
              className="size-full object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={t("workflowEditor.videoPreview.alt", { version: video.version })}
            />
          </VideoPreviewFrame>
        ) : (
          <ComposedVideoPreview video={video} compact />
        )}
      </div>
    );

  const aiScenes =
    config?.mode === "ai_shot"
      ? (config.aiScenes ?? []).flatMap((scene, sceneOrder) =>
          scene.mode === "standard" ? [] : [sceneOrder]
        )
      : [];
  const madeClips = clips.filter((clip) => aiScenes.includes(clip.sceneOrder));
  if (aiScenes.length > 0 && (running || madeClips.length > 0)) {
    const stored = madeClips.filter((clip) => clip.status === "stored" && clip.previewUrl).length;
    return (
      <div className="grid gap-2">
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewClips")}
          <span className="text-wf-faint tabular-nums">
            {stored}/{aiScenes.length}
          </span>
          <PreviewStatus
            tone={tone}
            label={running ? t("workflowEditor.runView.previewLive") : doneLabel}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {aiScenes.map((sceneOrder) => {
            const clip = madeClips.find((item) => item.sceneOrder === sceneOrder);
            const label = t("workflowEditor.runView.previewScene", { scene: sceneOrder + 1 });
            if (clip?.status === "stored" && clip.previewUrl)
              return (
                <div
                  key={sceneOrder}
                  className="border-wf-line animate-in fade-in zoom-in-95 relative aspect-[3/4] overflow-hidden rounded-md border bg-black duration-500"
                >
                  <video
                    src={clip.previewUrl}
                    className="size-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={label}
                  />
                  <SceneLabel label={label} />
                </div>
              );
            if (clip?.status === "failed")
              return (
                <div
                  key={sceneOrder}
                  className="border-wf-fail/40 bg-wf-fail/5 text-wf-fail relative grid aspect-[3/4] place-items-center rounded-md border"
                  title={clip.failure ?? undefined}
                >
                  <CircleAlert className="size-4" aria-hidden="true" />
                  <SceneLabel label={label} />
                </div>
              );
            // Not made yet: a placeholder while the step runs, an empty frame once it stopped without the clip.
            return running ? (
              <div key={sceneOrder} className="relative">
                <Skeleton className="bg-wf-line/70 aspect-[3/4] rounded-md" />
                <SceneLabel label={label} />
              </div>
            ) : (
              <div
                key={sceneOrder}
                className="border-wf-line relative aspect-[3/4] rounded-md border border-dashed"
              >
                <SceneLabel label={label} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewVideo")}
        <PreviewStatus
          tone={tone}
          label={tone === "live" ? t("workflowEditor.runView.previewRendering") : doneLabel}
        />
      </div>
      <RunGroupVideoStrip
        fallback={<SingleVideoPreview data={data} status={status} progress={progress} />}
      />
    </div>
  );
};

const SceneLabel = ({ label }: { label: string }) => (
  <span className="bg-wf-surface/90 text-wf-dim absolute bottom-1 left-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-wide">
    {label}
  </span>
);
