"use client";

import { AbsoluteFill, Img, Sequence, useCurrentFrame } from "remotion";

import type { VideoStoryboard } from "@/types/video-workflow";
import { getSceneFrame, getShotImageGeometry, getTransitionFrameStyle, type StandardVideoScene, type StandardVideoSource, type VideoTransition } from "@apcs/video-composition";

export type StandardVideoPreviewProps = {
  storyboard: VideoStoryboard;
  sources: Record<string, StandardVideoSource>;
};

const PreviewShot = ({ scene, source, width, height }: { scene: StandardVideoScene; source: StandardVideoSource; width: number; height: number }) => {
  const frame = useCurrentFrame();
  const { opacity, rotation, scale } = getSceneFrame(scene, frame);
  const geometry = getShotImageGeometry(scene, source, frame, { width, height });
  const inset = Math.round(Math.min(width, height) * .074);
  const captionBottom = Math.round(height * .079);
  const captionFontSize = Math.round(Math.min(width, height) * .048);
  const style = geometry.mode === "contain"
    ? { width: "100%", height: "100%", objectFit: "contain" as const, transform: `scale(${geometry.scale * scale}) rotate(${rotation}deg)` }
    : { position: "absolute" as const, width: geometry.width, height: geometry.height, maxWidth: "none", left: geometry.left, top: geometry.top, transform: `scale(${scale}) rotate(${rotation}deg)` };
  return <AbsoluteFill style={{ backgroundColor: "#111827", overflow: "hidden", opacity }}>
    <Img src={source.url} style={style} />
    {scene.text && <div style={{ position: "absolute", bottom: captionBottom, left: inset, right: inset, padding: `${Math.round(captionFontSize * .54)}px ${Math.round(captionFontSize * .69)}px`, backgroundColor: "rgba(0,0,0,.72)", color: "white", fontSize: captionFontSize, lineHeight: 1.35, fontFamily: "Arial, sans-serif", textAlign: "center", overflowWrap: "anywhere" }}>{scene.text}</div>}
  </AbsoluteFill>;
};

export const StandardVideoPreview = ({ storyboard, sources }: StandardVideoPreviewProps) => {
  let offset = 0;
  const fallbackOverlap = storyboard.transitionOverlapFrames ?? 0;
  return <AbsoluteFill style={{ backgroundColor: "#111827" }}>{storyboard.scenes.map((scene, index) => {
    const overlapFrames = scene.transitionFrames ?? fallbackOverlap;
    const from = Math.max(0, offset - overlapFrames);
    offset = from + scene.durationFrames;
    const source = sources[scene.mockupId];
    if (!source) throw new Error("Missing storyboard preview source");
    return <Sequence key={`${scene.sceneOrder}-${scene.mockupId}`} from={from} durationInFrames={scene.durationFrames}>
      <TransitionLayer sceneIndex={index} durationFrames={scene.durationFrames} transitionIn={scene.transition}
        transitionOut={storyboard.scenes[index + 1]?.transition ?? "none"} overlapFrames={overlapFrames}
        nextOverlapFrames={storyboard.scenes[index + 1]?.transitionFrames ?? fallbackOverlap}
        legacy={storyboard.outputDurationFrames == null}>
        <PreviewShot scene={scene} source={source} width={storyboard.width} height={storyboard.height} />
      </TransitionLayer>
    </Sequence>;
  })}<PreviewOverlays storyboard={storyboard} /></AbsoluteFill>;
};

const PreviewOverlays = ({ storyboard }: { storyboard: VideoStoryboard }) => {
  const frame = useCurrentFrame();
  return <>{(storyboard.videoEdit?.overlays ?? []).filter(item => frame >= item.startFrame && frame < item.endFrame).map(item => <div key={item.id} style={{ position: "absolute", left: `${item.x * 100}%`, top: `${item.y * 100}%`, transform: "translate(-50%, -50%)", maxWidth: "78%", padding: item.type === "cta" ? "8px 14px" : "5px 9px", color: item.textColor, background: item.preset === "minimal" || item.preset === "outline" ? "transparent" : item.backgroundColor, border: item.preset === "outline" ? `2px solid ${item.textColor}` : undefined, borderRadius: item.preset === "pill" ? 999 : 6, fontFamily: "Arial, sans-serif", fontWeight: item.preset === "bold" || item.type === "cta" ? 700 : 500, fontSize: `${item.fontScale * 100}vmin`, lineHeight: 1.1, textAlign: item.align }}>{item.text}</div>)}</>;
};

const TransitionLayer = ({ children, sceneIndex, durationFrames, transitionIn, transitionOut, overlapFrames, nextOverlapFrames, legacy }: {
  children: React.ReactNode; sceneIndex: number; durationFrames: number; transitionIn: VideoTransition;
  transitionOut: VideoTransition; overlapFrames: number; nextOverlapFrames: number; legacy: boolean;
}) => {
  const frame = useCurrentFrame();
  let style = { opacity: 1, transform: "none", clipPath: "none", filter: "none", flashOpacity: 0 };
  if (legacy && transitionIn === "fade") {
    style = { ...style, opacity: Math.min(frame / 8, Math.max(0, (durationFrames - 1 - frame) / 8)) };
  } else if (!legacy && sceneIndex > 0 && frame < overlapFrames) {
    style = getTransitionFrameStyle(transitionIn, frame, overlapFrames, "incoming");
  } else if (!legacy && transitionOut !== "none" && transitionOut !== "cut" && nextOverlapFrames > 0 && frame >= durationFrames - nextOverlapFrames) {
    const outgoing = getTransitionFrameStyle(transitionOut, frame - (durationFrames - nextOverlapFrames), nextOverlapFrames, "outgoing");
    style = { ...outgoing, flashOpacity: 0 };
  }
  return <AbsoluteFill style={{ opacity: style.opacity, transform: style.transform, clipPath: style.clipPath as React.CSSProperties["clipPath"], filter: style.filter }}>
    {children}
    {style.flashOpacity > 0 && <AbsoluteFill style={{ backgroundColor: "white", opacity: style.flashOpacity }} />}
  </AbsoluteFill>;
};
