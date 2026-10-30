"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { listMusicTracks, videoWorkflowKeys } from "@/api/video-workflow";
import {
  getStandardBaseCrop,
  resolveStandardMotionPlan,
} from "@/components/workflows/config-panel/fields/standard-motion-editor";
import { StandardVideoPreview } from "@/components/workflows/media/standard-video-composition";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import { loadMusicPreview } from "@/helpers/music-preview";
import type {
  AiVideoSceneOptions,
  GenerateVideoConfig,
  MockupAsset,
  Region,
  ScenePlan,
  VideoStoryboard,
} from "@/types/video-workflow";
import { Player } from "@remotion/player";
import { useQuery } from "@tanstack/react-query";

const FPS = 30;

type PreviewSource = { url: string; width: number; height: number };
type PreviewSources = Record<string, PreviewSource>;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

const mixRegion = (start: Region, end: Region, progress: number): Region => ({
  x: mix(start.x, end.x, progress),
  y: mix(start.y, end.y, progress),
  width: mix(start.width, end.width, progress),
  height: mix(start.height, end.height, progress),
});

const selectedSourceId = (scene: ScenePlan, config: GenerateVideoConfig) => {
  const configuredScene = config.aiScenes?.[scene.sceneOrder];
  if (scene.generationStrategy !== "standard" || configuredScene?.mode !== "standard")
    return scene.mockupId;

  return configuredScene.startFrameMode === "studio"
    ? (configuredScene.studioFrameId ?? scene.mockupId)
    : (configuredScene.mockupId ?? scene.mockupId);
};

const trimProgress = (scene: AiVideoSceneOptions) => {
  const sourceFrames = Math.max(
    1,
    Math.round(scene.displayDurationFrames ?? scene.durationSeconds * FPS)
  );
  const minimumFrames = Math.min(FPS, sourceFrames);
  const trimStartFrames = clamp(
    Math.round(scene.trimStartFrames ?? 0),
    0,
    sourceFrames - minimumFrames
  );
  const trimEndFrames = clamp(
    Math.round(scene.trimEndFrames ?? 0),
    0,
    sourceFrames - minimumFrames - trimStartFrames
  );
  const denominator = Math.max(1, sourceFrames - 1);
  return {
    start: trimStartFrames / denominator,
    end: (sourceFrames - trimEndFrames - 1) / denominator,
  };
};

const resolvePreviewScene = (
  scene: ScenePlan,
  configuredScene: AiVideoSceneOptions | undefined,
  asset: MockupAsset | undefined,
  aspectRatio: string,
  sourceKey: string
): ScenePlan => {
  const previewScene = { ...scene, mockupId: sourceKey };
  if (scene.generationStrategy !== "standard" || configuredScene?.mode !== "standard")
    return previewScene;

  const baseCrop = configuredScene.standardBaseCrop ?? getStandardBaseCrop(asset, aspectRatio);
  const plan = resolveStandardMotionPlan(configuredScene, baseCrop, aspectRatio);
  const progress = trimProgress(configuredScene);
  return {
    ...previewScene,
    motion: plan.motion,
    crop: mixRegion(plan.startCrop, plan.endCrop, progress.start),
    endCrop: mixRegion(plan.startCrop, plan.endCrop, progress.end),
    startScale: mix(plan.startScale, plan.endScale, progress.start),
    endScale: mix(plan.startScale, plan.endScale, progress.end),
    startRotation: mix(plan.startRotation, plan.endRotation, progress.start),
    endRotation: mix(plan.startRotation, plan.endRotation, progress.end),
  };
};

export const StoryboardPlayer = ({
  board,
  assets,
  config,
}: {
  board: VideoStoryboard;
  assets: MockupAsset[];
  config: GenerateVideoConfig;
}) => {
  const effectiveVideoEdit = config.videoEdit ?? board.videoEdit;
  const music = effectiveVideoEdit?.music;
  const expectsMusic = Boolean(music && !music.muted);
  const { data: tracks = [], isPending: musicCatalogPending } = useQuery({
    queryKey: videoWorkflowKeys.music(),
    queryFn: listMusicTracks,
    enabled: expectsMusic,
  });
  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === music?.trackId),
    [music?.trackId, tracks]
  );
  const [preparedMusic, setPreparedMusic] = useState<{
    trackId: string;
    sourceUrl: string;
  } | null>(null);
  const [musicLoadFailed, setMusicLoadFailed] = useState(false);
  const trackPreviewUrl = selectedTrack?.previewUrl;
  useEffect(() => {
    setPreparedMusic(null);
    setMusicLoadFailed(false);
    if (!expectsMusic || !music?.trackId || !trackPreviewUrl) return;

    const controller = new AbortController();
    let objectUrl: string | undefined;
    void loadMusicPreview(trackPreviewUrl, controller.signal)
      .then((audioBlob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(audioBlob);
        setPreparedMusic({ trackId: music.trackId, sourceUrl: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setMusicLoadFailed(true);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expectsMusic, music?.trackId, trackPreviewUrl]);
  const musicUrl =
    preparedMusic && preparedMusic.trackId === music?.trackId
      ? preparedMusic.sourceUrl
      : undefined;
  const musicDurationInFrames = selectedTrack
    ? Math.max(1, Math.round(selectedTrack.durationSeconds * FPS))
    : undefined;
  const requestedSources = useMemo(
    () =>
      board.scenes.map((scene, index) => ({
        sourceKey: `storyboard-scene-${scene.sceneOrder}-${index}`,
        assetId: selectedSourceId(scene, config),
        scene,
      })),
    [board.scenes, config]
  );
  const requiredSourceIds = requestedSources.map(({ sourceKey }) => sourceKey);
  const remoteSources = useMemo<PreviewSources>(
    () =>
      Object.fromEntries(
        requestedSources.flatMap(({ sourceKey, assetId }) => {
          const asset = assets.find((item) => item.id === assetId);
          return asset
            ? [
                [
                  sourceKey,
                  { url: asset.previewUrl, width: asset.width, height: asset.height },
                ] as const,
              ]
            : [];
        })
      ),
    [assets, requestedSources]
  );
  const previewBoard: VideoStoryboard = {
    ...board,
    videoEdit: effectiveVideoEdit,
    scenes: requestedSources.map(({ sourceKey, assetId, scene }) =>
      resolvePreviewScene(
        scene,
        config.aiScenes?.[scene.sceneOrder],
        assets.find((item) => item.id === assetId),
        board.aspectRatio,
        sourceKey
      )
    ),
  };

  const sourceRevisionKey = requiredSourceIds
    .map((sourceId) => {
      const source = remoteSources[sourceId];
      return source
        ? `${sourceId}:${source.url}:${source.width}x${source.height}`
        : `${sourceId}:missing`;
    })
    .join("|");
  if (Object.keys(remoteSources).length !== requiredSourceIds.length)
    return (
      <p className="text-sm text-amber-700">
        A storyboard source is no longer available. Refresh the preview.
      </p>
    );

  if (expectsMusic && (musicCatalogPending || (selectedTrack && !musicUrl && !musicLoadFailed)))
    return (
      <VideoPreviewFrame width={board.width} height={board.height}>
        <div
          className="text-primary-foreground grid size-full place-items-center bg-slate-950 p-6 text-center"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Preparing soundtrack…
          </span>
        </div>
      </VideoPreviewFrame>
    );

  if (expectsMusic && (!selectedTrack || musicLoadFailed))
    return (
      <VideoPreviewFrame width={board.width} height={board.height}>
        <p
          className="grid size-full place-items-center bg-slate-950 p-6 text-center text-sm text-amber-200"
          role="alert"
        >
          The selected soundtrack could not be loaded. Refresh the storyboard preview to retry.
        </p>
      </VideoPreviewFrame>
    );

  const sources = remoteSources;

  // Resolve Standard scenes from the same selected asset and motion settings as the editor. The
  // API storyboard can lag behind the current form state while a user is choosing a keyframe, and
  // using its stale crop here makes the preview show only a corner of the image.
  const framingRevisionKey = previewBoard.scenes
    .map(
      (scene) =>
        `${scene.sceneOrder}:${scene.motion}:${JSON.stringify(scene.crop)}:${JSON.stringify(scene.endCrop)}:${scene.startScale}:${scene.endScale}:${scene.startRotation}:${scene.endRotation}`
    )
    .join("|");

  return (
    <VideoPreviewFrame width={board.width} height={board.height}>
      <Player
        key={`${board.fingerprint}:${sourceRevisionKey}:${framingRevisionKey}:${music?.trackId ?? "silent"}:${musicUrl ?? "no-source"}`}
        component={StandardVideoPreview}
        inputProps={{ storyboard: previewBoard, sources, musicUrl, musicDurationInFrames }}
        durationInFrames={board.outputDurationFrames ?? board.durationSeconds * 30}
        compositionWidth={board.width}
        compositionHeight={board.height}
        fps={30}
        controls
        autoPlay={false}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%" }}
      />
    </VideoPreviewFrame>
  );
};
