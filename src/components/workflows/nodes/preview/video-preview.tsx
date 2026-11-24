"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { CircleAlert, ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { ScenePreviews } from "@/components/workflows/nodes/preview/scene-previews";
import { SingleVideoPreview } from "@/components/workflows/nodes/preview/single-video-preview";
import { RunGroupVideoStrip } from "@/components/workflows/nodes/run-group-video-strip";
import { previewToneOf } from "@/helpers/workflow-run-view";
import {
  generateProgressOf,
  generateStatusOf,
  STOPPED,
  useGroupVideos,
  useVideoGroupTargets,
} from "@/hooks/queries/use-group-videos";
import { useRunSceneVideos } from "@/hooks/queries/use-run-scene-videos";
import { useRunVideos } from "@/hooks/queries/use-run-videos";
import { useVideoRunId } from "@/hooks/use-video-run-id";
import type { GenerateVideoConfig, RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";

type VideoPreviewProps = {
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

/**
 * Beside Generate Video while it runs and once it is done. A batch video run with several designs shows one design at a
 * time, picked by its mock-up, with each of its scenes on its own (see `GroupVideoPreview`). Otherwise: each AI scene as
 * the provider makes it, then the whole video once it is made, played as at Review Video; a video with no AI scene, or
 * not made yet, shows the video's progress.
 */
export const VideoPreview = (props: VideoPreviewProps) => {
  const { targets } = useVideoGroupTargets();
  return targets.length > 1 ? <GroupVideoPreview targets={targets} {...props} /> : <OneVideoPreview {...props} />;
};

const OneVideoPreview = ({ data, status, progress }: VideoPreviewProps) => {
  const { t } = useTranslation("common");
  const config = data.config as GenerateVideoConfig;
  // In a batch video run of one design, that design's run.
  const { videos: groupVideos } = useGroupVideos();
  const openRunId = useVideoRunId();
  const design =
    groupVideos.find((item) => item.target.runId === openRunId) ??
    groupVideos.find((item) => item.video) ??
    groupVideos[0];
  const runId = openRunId ?? design?.target.runId ?? null;
  const { data: runVideos } = useRunVideos(runId);
  const video = groupVideos.length > 0 ? (design?.video ?? runVideos?.[0]) : runVideos?.[0];
  const running = status === "running";
  const tone = previewToneOf(status);
  const doneLabel =
    tone === "failed"
      ? t("workflowEditor.runView.previewFailed")
      : t("workflowEditor.runView.previewDone");

  // Made: each of its scenes on its own (Photo motion and AI alike), not the whole video. Without scene data (an
  // older API) `ScenePreviews` plays the whole video instead.
  if (!running && video && (video.previewUrl || video.preview))
    return (
      <div className="grid gap-2">
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewVideo")}
          <span className="text-wf-faint tabular-nums">v{video.version}</span>
          <PreviewStatus tone={tone} label={doneLabel} />
        </div>
        <ScenePreviews video={video} />
      </div>
    );

  return (
    <LiveClips
      runId={runId}
      config={config}
      running={running}
      header={(stored, total) => (
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewClips")}
          <span className="text-wf-faint tabular-nums">
            {stored}/{total}
          </span>
          <PreviewStatus
            tone={tone}
            label={running ? t("workflowEditor.runView.previewLive") : doneLabel}
          />
        </div>
      )}
      fallback={
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
      }
    />
  );
};

/**
 * A batch video run with several designs: a row of their mock-ups to pick one, and the picked design's scenes below,
 * each on its own (Photo motion and AI alike), without the whole video. Only the picked design's video is loaded:
 * another design's video and media are fetched when the seller picks it.
 */
const GroupVideoPreview = ({
  targets,
  data,
  status,
}: VideoPreviewProps & { targets: RunGroupTarget[] }) => {
  const { t } = useTranslation("common");
  const openRunId = useVideoRunId();
  const [pickedRunId, setPickedRunId] = useState<string | null>(null);
  const made = (target: RunGroupTarget) =>
    ["completed", "waiting_for_review"].includes(generateStatusOf(target));
  const target =
    targets.find((item) => item.runId === pickedRunId) ??
    targets.find((item) => item.runId === openRunId) ??
    targets.find(made) ??
    targets[0]!;
  const { data: videos } = useRunVideos(target.runId);
  const video = made(target) ? videos?.[0] : undefined;
  const generate = generateStatusOf(target);
  const tone = previewToneOf(status);
  const doneLabel =
    tone === "failed"
      ? t("workflowEditor.runView.previewFailed")
      : t("workflowEditor.runView.previewDone");

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewVideo")}
        {video && <span className="text-wf-faint tabular-nums">v{video.version}</span>}
        <PreviewStatus
          tone={tone}
          label={tone === "live" ? t("workflowEditor.runView.previewRendering") : doneLabel}
        />
      </div>
      <div
        role="group"
        aria-label={t("workflowEditor.runView.previewChooseProduct")}
        className="nodrag nowheel flex gap-1.5 overflow-x-auto pb-0.5"
      >
        {targets.map((item, index) => {
          const selected = item.runId === target.runId;
          const name = `${item.productName} · ${item.designLabel}`;
          return (
            <button
              key={item.runId}
              type="button"
              aria-pressed={selected}
              aria-label={t("workflowEditor.runView.previewProductAria", { index: index + 1, name })}
              title={name}
              onClick={() => setPickedRunId(item.runId)}
              className={cn(
                "bg-wf-muted focus-visible:ring-wf-accent relative size-10 shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-2",
                selected ? "ring-wf-accent ring-2" : "hover:ring-wf-accent/45 ring-1 ring-black/[0.07]"
              )}
            >
              {item.previewUrl ? (
                <Image src={item.previewUrl} alt="" fill sizes="40px" unoptimized className="object-cover" />
              ) : (
                <ImageIcon className="text-wf-faint absolute inset-0 m-auto size-4" aria-hidden="true" />
              )}
              {STOPPED.has(generateStatusOf(item)) && (
                <span className="bg-wf-fail absolute top-0.5 right-0.5 size-1.5 rounded-full" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-wf-faint truncate text-[10px]" title={`${target.productName} · ${target.designLabel}`}>
        {target.productName} · {target.designLabel}
      </p>
      {video && (video.preview || video.previewUrl) ? (
        <ScenePreviews video={video} />
      ) : (
        <LiveClips
          runId={target.runId}
          config={target.config ?? (data.config as GenerateVideoConfig)}
          running={generate === "running"}
          fallback={<DesignProgress target={target} />}
        />
      )}
    </div>
  );
};

/** Where a design's video is while it has none to show: its progress, or why it stopped. */
const DesignProgress = ({ target }: { target: RunGroupTarget }) => {
  const { t } = useTranslation("common");
  const status = generateStatusOf(target);
  const progress = Math.max(0, Math.min(100, Math.round(generateProgressOf(target))));
  const stopped = STOPPED.has(status);
  const label = stopped
    ? status === "failed"
      ? t("workflowEditor.runGroup.runStatuses.failed")
      : status === "cancelled"
        ? t("workflowEditor.runGroup.stopped")
        : t("workflowEditor.runGroup.runStatuses.waiting_for_input")
    : status === "queued"
      ? t("workflowEditor.runGroup.runStatuses.queued")
      : t("workflowEditor.videoStrip.processingProgress", { progress });
  return (
    <div className="bg-wf-muted relative grid min-h-24 place-items-center overflow-hidden rounded-md px-2 text-center">
      <span className={cn("text-[11px] font-medium", stopped ? "text-wf-fail" : "text-wf-dim")}>{label}</span>
      {!stopped && (
        <span aria-hidden="true" className="bg-wf-line absolute inset-x-0 bottom-0 h-1">
          <span className="bg-wf-accent block h-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </span>
      )}
    </div>
  );
};

/**
 * Each AI scene of a run as the provider makes it: a placeholder while it is made, its clip once it is stored. Shows
 * `fallback` for a video with no AI scene, or none made yet once the step stopped.
 */
const LiveClips = ({
  runId,
  config,
  running,
  header,
  fallback,
}: {
  runId: string | null;
  config: GenerateVideoConfig | undefined;
  running: boolean;
  header?: (stored: number, total: number) => ReactNode;
  fallback: ReactNode;
}) => {
  const { t } = useTranslation("common");
  const { data: clips = [] } = useRunSceneVideos(runId);
  const aiScenes =
    config?.mode === "ai_shot"
      ? (config.aiScenes ?? []).flatMap((scene, sceneOrder) =>
          scene.mode === "standard" ? [] : [sceneOrder]
        )
      : [];
  const madeClips = clips.filter((clip) => aiScenes.includes(clip.sceneOrder));
  if (aiScenes.length === 0 || (!running && madeClips.length === 0)) return <>{fallback}</>;
  const stored = madeClips.filter((clip) => clip.status === "stored" && clip.previewUrl).length;
  return (
    <div className="grid gap-2">
      {header?.(stored, aiScenes.length)}
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
};

const SceneLabel = ({ label }: { label: string }) => (
  <span className="bg-wf-surface/90 text-wf-dim absolute bottom-1 left-1 rounded-sm px-1 py-0.5 text-[9px] font-medium tracking-wide">
    {label}
  </span>
);
