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
  if (board.mode === "ai_shot") return <div className="space-y-2 rounded-lg border p-3" aria-label="AI Shot storyboard preview">
    <p className="text-xs font-medium">Storyboard only · AI motion appears after Veo generation</p>
    <div className="grid grid-cols-2 gap-2">{board.scenes.map(scene => {
      const source = sources[scene.mockupId];
      return <div key={scene.sceneOrder} className="bg-muted/40 rounded-md border p-2"><Image src={source.url} alt={`Source for scene ${scene.sceneOrder + 1}`} width={source.width} height={source.height} unoptimized className="h-24 w-full object-contain" /><p className="mt-1 text-xs">Scene {scene.sceneOrder + 1} · {scene.generationStrategy === "ai_shot" ? "AI Shot" : "Standard"} · {(scene.durationFrames / 30).toFixed(1)}s</p></div>;
    })}</div>
  </div>;
  return <VideoPreviewFrame width={board.width} height={board.height}>
    <Player key={board.fingerprint} component={StandardVideoPreview} inputProps={{ storyboard: board, sources }}
      durationInFrames={board.durationSeconds * 30} compositionWidth={board.width} compositionHeight={board.height} fps={30}
      controls autoPlay={false} acknowledgeRemotionLicense className="size-full" />
  </VideoPreviewFrame>;
};
