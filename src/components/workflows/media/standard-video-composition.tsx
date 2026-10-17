"use client";

import { AbsoluteFill, Img, Sequence, useCurrentFrame } from "remotion";

import type { VideoStoryboard } from "@/types/video-workflow";
import { getSceneFrame, getShotImageGeometry, type StandardVideoScene, type StandardVideoSource } from "@apcs/video-composition";

export type StandardVideoPreviewProps = {
  storyboard: VideoStoryboard;
  sources: Record<string, StandardVideoSource>;
};

const PreviewShot = ({ scene, source, width, height }: { scene: StandardVideoScene; source: StandardVideoSource; width: number; height: number }) => {
  const frame = useCurrentFrame();
  const { opacity } = getSceneFrame(scene, frame);
  const geometry = getShotImageGeometry(scene, source, frame, { width, height });
  const inset = Math.round(Math.min(width, height) * .074);
  const captionBottom = Math.round(height * .079);
  const captionFontSize = Math.round(Math.min(width, height) * .048);
  const style = geometry.mode === "contain"
    ? { width: "100%", height: "100%", objectFit: "contain" as const, transform: `scale(${geometry.scale})` }
    : { position: "absolute" as const, width: geometry.width, height: geometry.height, maxWidth: "none", left: geometry.left, top: geometry.top };
  return <AbsoluteFill style={{ backgroundColor: "#111827", overflow: "hidden", opacity }}>
    <Img src={source.url} style={style} />
    {scene.text && <div style={{ position: "absolute", bottom: captionBottom, left: inset, right: inset, padding: `${Math.round(captionFontSize * .54)}px ${Math.round(captionFontSize * .69)}px`, backgroundColor: "rgba(0,0,0,.72)", color: "white", fontSize: captionFontSize, lineHeight: 1.35, fontFamily: "Arial, sans-serif", textAlign: "center", overflowWrap: "anywhere" }}>{scene.text}</div>}
  </AbsoluteFill>;
};

export const StandardVideoPreview = ({ storyboard, sources }: StandardVideoPreviewProps) => {
  let offset = 0;
  return <AbsoluteFill style={{ backgroundColor: "#111827" }}>{storyboard.scenes.map(scene => {
    const from = offset;
    offset += scene.durationFrames;
    const source = sources[scene.mockupId];
    if (!source) throw new Error("Missing storyboard preview source");
    return <Sequence key={`${scene.sceneOrder}-${scene.mockupId}`} from={from} durationInFrames={scene.durationFrames}>
      <PreviewShot scene={scene} source={source} width={storyboard.width} height={storyboard.height} />
    </Sequence>;
  })}</AbsoluteFill>;
};
