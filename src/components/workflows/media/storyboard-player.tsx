"use client";

import Image from "next/image";

import { StandardVideoPreview } from "@/components/workflows/media/standard-video-composition";
import { VideoPreviewFrame } from "@/components/workflows/media/video-preview-frame";
import type { MockupAsset, VideoStoryboard } from "@/types/video-workflow";
import { Player } from "@remotion/player";

export const StoryboardPlayer = ({ board, assets }: { board: VideoStoryboard; assets: MockupAsset[] }) => {
  const sources = Object.fromEntries(board.scenes.map(scene => {
    const asset = assets.find(item => item.id === scene.mockupId);
    return [scene.mockupId, asset ? { url: asset.previewUrl, width: asset.width, height: asset.height } : null];
  }).filter((entry): entry is [string, { url: string; width: number; height: number }] => entry[1] !== null));
  if (Object.keys(sources).length !== new Set(board.scenes.map(scene => scene.mockupId)).size)
    return <p className="text-sm text-amber-700">A storyboard source is no longer available. Refresh the preview.</p>;
  if (board.mode === "ai_shot") return <ol className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))" }} aria-label="AI scene storyboard preview">
      {board.scenes.map(scene => {
      const source = sources[scene.mockupId];
      return <li key={scene.sceneOrder} className="bg-muted/40 min-w-0 overflow-hidden rounded-lg">
        <div className="bg-muted/70 relative flex items-center justify-center" style={{ aspectRatio: `${source.width} / ${source.height}` }}>
          <Image src={source.url} alt={`Source frame for scene ${scene.sceneOrder + 1}`} width={source.width} height={source.height} unoptimized className="size-full object-contain" />
          <span className="bg-background/95 absolute top-2 left-2 rounded-md px-2 py-1 text-xs font-semibold">Scene {scene.sceneOrder + 1} · {scene.generationStrategy === "standard" ? "Standard" : "AI video"}</span>
          <span className="bg-background/95 text-muted-foreground absolute top-2 right-2 rounded-md px-2 py-1 text-xs tabular-nums">{(scene.durationFrames / 30).toFixed(1)}s</span>
        </div>
        <div className="space-y-1 px-3 py-2.5">
          <p className="truncate text-xs font-semibold capitalize" title={scene.aiTemplateCode?.replaceAll("_", " ") ?? "Standard camera move"}>
            {scene.aiTemplateCode?.replaceAll("_", " ") ?? "Camera move"}
          </p>
          <p className="text-muted-foreground truncate text-xs capitalize">
            {scene.aiSettings?.cameraMovement?.replaceAll("_", " ") ?? scene.motion.replaceAll("_", " ")}
          </p>
        </div>
      </li>;
    })}
  </ol>;
  return <VideoPreviewFrame width={board.width} height={board.height}>
    <Player key={board.fingerprint} component={StandardVideoPreview} inputProps={{ storyboard: board, sources }}
      durationInFrames={board.outputDurationFrames ?? board.durationSeconds * 30} compositionWidth={board.width} compositionHeight={board.height} fps={30}
      controls autoPlay={false} acknowledgeRemotionLicense className="size-full" />
  </VideoPreviewFrame>;
};
