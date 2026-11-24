"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { videoWorkflowKeys } from "@/api/video-workflow";
import { ComposedVideoPreview, FPS, REFRESH_LINKS_MS, toComposition } from "@/components/workflows/media/composed-video-preview";
import { ExportScene, type SceneCompositionProps } from "@/components/workflows/media/video-composition";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import type { PromoVideo } from "@/types/video-workflow";
import { Player, type PlayerRef } from "@remotion/player";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Each scene of a made video on its own, Photo motion and AI alike, drawn by the composition Export ZIP packages a scene
 * with (`ExportScene`): its picture, motion, crop and text, without the music. A video without scene data (an older API)
 * plays whole instead.
 */
export const ScenePreviews = ({ video }: { video: PromoVideo }) => {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const composition = useMemo(() => (video.preview ? toComposition(video.preview) : null), [video.preview]);

  useEffect(() => {
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: videoWorkflowKeys.videos(video.runId) });
    }, REFRESH_LINKS_MS);
    return () => clearInterval(timer);
  }, [queryClient, video.runId]);

  if (!composition)
    return video.previewUrl ? (
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
    );

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {composition.storyboard.scenes.map((scene) => {
        const label = t("workflowEditor.runView.previewScene", { scene: scene.sceneOrder + 1 });
        const ai = scene.generationStrategy === "ai_shot";
        const kind = ai ? t("workflowEditor.runView.previewSceneAi") : t("workflowEditor.runView.previewScenePhoto");
        const missingClip = ai && !composition.clips?.[scene.sceneOrder];
        const props: SceneCompositionProps = { ...composition, sceneOrder: scene.sceneOrder };
        return (
          <figure key={scene.sceneOrder} className="nodrag nowheel grid gap-1">
            <div
              className="border-wf-line relative overflow-hidden rounded-md border bg-black"
              style={{ aspectRatio: `${video.width} / ${video.height}` }}
            >
              {missingClip ? (
                <span className="text-wf-faint absolute inset-0 grid place-items-center">
                  <Film className="size-4" aria-hidden="true" />
                </span>
              ) : (
                <ScenePlayer
                  props={props}
                  durationFrames={scene.durationFrames}
                  width={video.width}
                  height={video.height}
                  label={label}
                />
              )}
            </div>
            <figcaption className="text-wf-dim flex items-center justify-between gap-1 text-[9px] font-medium tracking-wide">
              <span>{label}</span>
              <span className="text-wf-faint">{kind}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
};

/**
 * One scene, with nothing over it but a play button in the middle: no time, bar or other controls. The button starts
 * the scene and goes away while it plays; a click on the playing scene pauses it and brings the button back.
 */
const ScenePlayer = ({
  props,
  durationFrames,
  width,
  height,
  label,
}: {
  props: SceneCompositionProps;
  durationFrames: number;
  width: number;
  height: number;
  label: string;
}) => {
  const { t } = useTranslation("common");
  const player = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    current.addEventListener("play", onPlay);
    current.addEventListener("pause", onPause);
    return () => {
      current.removeEventListener("play", onPlay);
      current.removeEventListener("pause", onPause);
    };
  }, []);

  return (
    <>
      <Player
        ref={player}
        component={ExportScene}
        inputProps={props}
        durationInFrames={Math.max(1, durationFrames)}
        compositionWidth={width}
        compositionHeight={height}
        fps={FPS}
        controls={false}
        loop
        clickToPlay
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%" }}
      />
      {!playing && (
        <button
          type="button"
          aria-label={t("workflowEditor.runView.previewPlayScene", { scene: label })}
          onClick={() => player.current?.play()}
          className="focus-visible:ring-wf-accent absolute inset-0 grid place-items-center bg-black/10 outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-[2px] transition-transform duration-150 hover:scale-105 motion-reduce:transition-none">
            <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
    </>
  );
};
