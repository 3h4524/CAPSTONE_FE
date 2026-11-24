"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { CircleAlert, ImageIcon, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { ScenePreviews } from "@/components/workflows/nodes/preview/scene-previews";
import { SingleVideoPreview } from "@/components/workflows/nodes/preview/single-video-preview";
import { VideoCinemaModal } from "@/components/workflows/nodes/preview/video-cinema-modal";
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
import { useRunSimulationStore } from "@/stores/run-simulation";
import type { GenerateVideoConfig, PromoVideo, RunGroupTarget } from "@/types/video-workflow";
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
  // "Preview run" on the canvas plays a sample video when there is no real one.
  const simulatedVideo = useRunSimulationStore((state) => state.video);
  const video: Partial<PromoVideo> | undefined =
    (groupVideos.length > 0 ? (design?.video ?? runVideos?.[0]) : runVideos?.[0]) ?? simulatedVideo ?? undefined;
  const cinema = useCinema();
  const running = status === "running";
  const tone = previewToneOf(status);
  const doneLabel =
    tone === "failed"
      ? t("workflowEditor.runView.previewFailed")
      : t("workflowEditor.runView.previewDone");

  // Made: each of its scenes on its own (Photo motion and AI alike), not the whole video; the whole video opens in the
  // large player. Without scene data (an older API) `ScenePreviews` plays the whole video, and so does a sample video.
  if (!running && video && (video.previewUrl || video.preview))
    return (
      <div className="grid gap-2">
        <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewVideo")}
          {video.version != null && <span className="text-wf-faint tabular-nums">v{video.version}</span>}
          <PreviewStatus tone={tone} label={doneLabel} />
          {video.previewUrl && (
            <ExpandButton
              label={t("workflowEditor.runView.previewExpandVideo")}
              onClick={() =>
                cinema.open(
                  video.previewUrl ?? null,
                  video,
                  t("workflowEditor.runView.previewVideoVersion", { version: video.version ?? 1 })
                )
              }
            />
          )}
        </div>
        {video.id ? (
          <ScenePreviews video={video as PromoVideo} />
        ) : (
          <VideoPreviewFrame width={video.width ?? 1080} height={video.height ?? 1920} maxHeightRem={22}>
            <video
              src={video.previewUrl ?? undefined}
              poster={video.thumbnailUrl ?? undefined}
              className="size-full object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={t("workflowEditor.videoPreview.alt", { version: video.version ?? 1 })}
            />
          </VideoPreviewFrame>
        )}
        {cinema.modal}
      </div>
    );

  return (
    <>
      <LiveClips
      runId={runId}
      config={config}
      running={running}
      onExpand={(url, label) => cinema.open(url, null, label)}
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
      {cinema.modal}
    </>
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
  const cinema = useCinema();
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
        {video?.previewUrl && (
          <ExpandButton
            label={t("workflowEditor.runView.previewExpandVideo")}
            onClick={() => cinema.open(video.previewUrl, video, `${target.productName} · ${target.designLabel}`)}
          />
        )}
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
          onExpand={(url, label) => cinema.open(url, null, label)}
          fallback={<DesignProgress target={target} />}
        />
      )}
      {cinema.modal}
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
  onExpand,
  fallback,
}: {
  runId: string | null;
  config: GenerateVideoConfig | undefined;
  running: boolean;
  header?: (stored: number, total: number) => ReactNode;
  /** Opens a stored clip in the large player. */
  onExpand?: (url: string, label: string) => void;
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
                className="group border-wf-line animate-in fade-in zoom-in-95 relative aspect-[3/4] overflow-hidden rounded-md border bg-black duration-500"
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
                {onExpand && clip.previewUrl && (
                  <button
                    type="button"
                    onClick={() => onExpand(clip.previewUrl ?? "", label)}
                    className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/90 focus-visible:opacity-100"
                    aria-label={t("workflowEditor.runView.previewExpandScene", { scene: label })}
                  >
                    <Maximize2 className="size-2.5" aria-hidden="true" />
                  </button>
                )}
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

/** The large player a preview opens its video, or one clip, in (`VideoCinemaModal`), with what it shows. */
const useCinema = () => {
  const [state, setState] = useState<{
    open: boolean;
    url: string | null;
    video: Partial<PromoVideo> | null;
    title?: string;
  }>({ open: false, url: null, video: null });
  return {
    open: (url: string | null, video: Partial<PromoVideo> | null, title?: string) =>
      setState({ open: true, url, video, title }),
    modal: (
      <VideoCinemaModal
        video={state.video}
        videoUrl={state.url}
        title={state.title}
        open={state.open}
        onOpenChange={(open) => setState((current) => ({ ...current, open }))}
      />
    ),
  };
};

const ExpandButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:text-wf-ink text-wf-faint nodrag ml-auto rounded p-0.5"
    aria-label={label}
    title={label}
  >
    <Maximize2 className="size-3" aria-hidden="true" />
  </button>
);
