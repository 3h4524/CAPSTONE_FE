"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { ComposedVideoPreview } from "@/components/workflows/media/composed-video-preview";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { videoPosterUrl } from "@/helpers/video-poster";
import { useGroupVideos } from "@/hooks/queries/use-group-videos";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig } from "@/types/video-workflow";
import type { WorkflowNodeStatus } from "@/types/workflow";

type VideoPreviewProps = {
  status: WorkflowNodeStatus;
};

/**
 * Beside Generate Video while it runs: each AI scene as the provider makes it (a placeholder while it is made, its clip
 * once it is stored), then the whole video once it is made, played as at Review Video.
 */
export const VideoPreview = ({ status }: VideoPreviewProps) => {
  const { t } = useTranslation("common");
  // Both are always read: the run in the URL wins, as on the node itself (VideoNodePreview).
  const urlRunId = useSearchParams().get("run");
  const storedRunId = useWorkflowStore((state) => state.videoRunId);
  const config = useWorkflowStore(
    (state) => state.nodes.find((node) => node.data.type === "generate-video")?.data.config as GenerateVideoConfig | undefined
  );
  // In a batch video run, the design open on the canvas, or else the first design with a video.
  const { videos: groupVideos } = useGroupVideos();
  const openRunId = urlRunId ?? storedRunId;
  const design =
    groupVideos.find((item) => item.target.runId === openRunId) ??
    groupVideos.find((item) => item.video) ??
    groupVideos[0];
  const runId = openRunId ?? design?.target.runId ?? null;
  const { data: clips = [] } = useRunSceneVideos(runId);
  const { data: runVideos } = useRunVideos(runId);
  const video = groupVideos.length > 0 ? (design?.video ?? runVideos?.[0]) : runVideos?.[0];
  const running = status === "running";
  const doneLabel = status === "failed" ? t("workflowEditor.runView.previewFailed") : t("workflowEditor.runView.previewDone");

  // Made: the whole video, its file once rendered, else drawn from its scenes as Review Video does.
  if (!running && video && (video.previewUrl || video.preview))
    return (
      <div className="grid gap-2">
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewVideo")}
          <span className="text-wf-faint tabular-nums">v{video.version}</span>
          <PreviewStatus tone={status === "failed" ? "failed" : "done"} label={doneLabel} />
        </div>
        {/* The callout lets the canvas take the pointer; the player takes it back, and the canvas does not pan or zoom under it. */}
        <div className="nodrag nopan nowheel pointer-events-auto">
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
      </div>
    );

  const aiScenes =
    config?.mode === "ai_shot"
      ? (config.aiScenes ?? []).flatMap((scene, sceneOrder) => (scene.mode === "standard" ? [] : [sceneOrder]))
      : [];
  const poster = videoPosterUrl(video);
  const stored = aiScenes.filter((sceneOrder) =>
    clips.some((clip) => clip.sceneOrder === sceneOrder && clip.status === "stored" && clip.previewUrl)
  ).length;
  // A video with no AI scene has nothing made scene by scene: it shows the video itself, or its place while it is made.
  if (aiScenes.length === 0 && !poster && !running) return null;

  const tone = running ? "live" : status === "failed" ? "failed" : "done";
  const statusLabel = running ? t("workflowEditor.runView.previewLive") : doneLabel;

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {aiScenes.length > 0 ? t("workflowEditor.runView.previewClips") : t("workflowEditor.runView.previewVideo")}
        {aiScenes.length > 0 && (
          <span className="text-wf-faint tabular-nums">
            {stored}/{aiScenes.length}
          </span>
        )}
        <PreviewStatus tone={tone} label={statusLabel} />
      </div>
      {aiScenes.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {aiScenes.map((sceneOrder) => {
            const clip = clips.find((item) => item.sceneOrder === sceneOrder);
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
                <Skeleton className="aspect-[3/4] rounded-md" />
                <SceneLabel label={label} />
              </div>
            ) : (
              <div key={sceneOrder} className="border-wf-line relative aspect-[3/4] rounded-md border border-dashed">
                <SceneLabel label={label} />
              </div>
            );
          })}
        </div>
      ) : poster ? (
        <div className="border-wf-line animate-in fade-in relative aspect-[3/4] overflow-hidden rounded-md border duration-500">
          <Image src={poster} alt="" fill sizes="240px" unoptimized className="object-cover" />
        </div>
      ) : (
        <Skeleton className="aspect-[3/4] rounded-md" />
      )}
    </div>
  );
};

const SceneLabel = ({ label }: { label: string }) => (
  <span className="bg-wf-surface/90 text-wf-dim absolute bottom-1 left-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-wide">
    {label}
  </span>
);
