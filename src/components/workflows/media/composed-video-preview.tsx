"use client";

import { useEffect, useMemo } from "react";
import { Film, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { videoWorkflowKeys } from "@/api/video-workflow";
import {
  type CompositionProps,
  type CompositionStoryboard,
  Showcase,
  totalFrames,
} from "@/components/workflows/media/video-composition";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { useSoundtrackPreview } from "@/hooks/use-soundtrack-preview";
import type { PromoVideo, VideoPreviewData } from "@/types/video-workflow";
import { Player } from "@remotion/player";
import { useQueryClient } from "@tanstack/react-query";

const FPS = 30;
/** The links in the preview are signed for ten minutes: ask for fresh ones well before they lapse. */
const REFRESH_LINKS_MS = 4 * 60_000;

const toComposition = (preview: VideoPreviewData): CompositionProps => {
  const board = preview.storyboard;
  const storyboard: CompositionStoryboard = {
    width: board.width,
    height: board.height,
    durationSeconds: board.durationSeconds,
    outputDurationFrames: board.outputDurationFrames,
    transitionOverlapFrames: board.transitionOverlapFrames ?? 0,
    scenes: board.scenes.map((scene) => ({
      ...scene,
      trimStartFrames: scene.trimStartFrames ?? 0,
      transitionFrames: scene.transitionFrames ?? 0,
    })),
    videoEdit: board.videoEdit,
  };
  return {
    storyboard,
    sources: preview.sources,
    clips: Object.fromEntries(Object.entries(preview.clips).map(([order, url]) => [Number(order), url])),
  };
};

const Notice = ({ video, children, busy, maxHeightRem }: { video: PromoVideo; children: string; busy?: boolean; maxHeightRem: number }) => (
  <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={maxHeightRem}>
    <div className="text-primary-foreground grid size-full place-items-center bg-slate-950 p-6 text-center" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Film className="size-4" aria-hidden="true" />}
        {children}
      </span>
    </div>
  </VideoPreviewFrame>
);

/**
 * Plays a video that has no file yet, from its scenes: the photos with their motion and the AI clips, in order, with the
 * transitions, overlays and music. It is drawn by the very composition the media worker renders (`video-composition.tsx`), so what
 * the seller sees here is what the final video will be.
 */
export const ComposedVideoPreview = ({ video, compact = false }: {
  video: PromoVideo;
  /** Smaller, without the note under the player: for the preview beside a node on the canvas. */
  compact?: boolean;
}) => {
  const { t } = useTranslation("common");
  const maxHeightRem = compact ? 22 : 34;
  const queryClient = useQueryClient();
  const preview = video.preview;
  const soundtrack = useSoundtrackPreview(preview?.storyboard.videoEdit);
  const composition = useMemo(() => (preview ? toComposition(preview) : null), [preview]);

  useEffect(() => {
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.videos(video.runId) });
    }, REFRESH_LINKS_MS);
    return () => clearInterval(timer);
  }, [queryClient, video.runId]);

  if (!preview || !composition) return <Notice video={video} maxHeightRem={maxHeightRem}>{t("workflowMedia.videoReview.preparing")}</Notice>;
  const aiScenes = composition.storyboard.scenes.filter((scene) => scene.generationStrategy === "ai_shot");
  if (aiScenes.some((scene) => !composition.clips?.[scene.sceneOrder]))
    return <Notice video={video} maxHeightRem={maxHeightRem} busy>{t("workflowMedia.videoReview.composedPreviewWaiting")}</Notice>;
  if (soundtrack.status === "loading")
    return <Notice video={video} maxHeightRem={maxHeightRem} busy>{t("workflowMedia.storyboardPlayer.preparingSoundtrack")}</Notice>;
  if (soundtrack.status === "failed")
    return <Notice video={video} maxHeightRem={maxHeightRem}>{t("workflowMedia.storyboardPlayer.soundtrackFailed")}</Notice>;

  const props: CompositionProps = { ...composition, music: soundtrack.status === "ready" ? soundtrack.url : undefined };
  return (
    <div className="space-y-2">
      <VideoPreviewFrame width={video.width} height={video.height} maxHeightRem={maxHeightRem}>
        <Player
          // The links are renewed from time to time; only another version of the video starts the player over.
          key={`${video.id}:${preview.storyboard.fingerprint}`}
          component={Showcase}
          inputProps={props}
          durationInFrames={totalFrames(composition.storyboard)}
          compositionWidth={video.width}
          compositionHeight={video.height}
          fps={FPS}
          controls
          autoPlay={false}
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </VideoPreviewFrame>
      {!compact && <p className="text-muted-foreground text-[11px] leading-relaxed">
        {video.status === "rendering"
          ? t("workflowMedia.videoReview.rendering")
          : `${t("workflowMedia.videoReview.composedPreview")} ${t("workflowMedia.videoReview.composedPreviewNote")}`}
      </p>}
    </div>
  );
};
