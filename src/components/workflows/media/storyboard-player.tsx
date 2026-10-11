"use client";

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
  return <VideoPreviewFrame width={board.width} height={board.height}>
    <Player key={board.fingerprint} component={StandardVideoPreview} inputProps={{ storyboard: board, sources }}
      durationInFrames={board.durationSeconds * 30} compositionWidth={board.width} compositionHeight={board.height} fps={30}
      controls autoPlay={false} acknowledgeRemotionLicense className="size-full" />
  </VideoPreviewFrame>;
};
