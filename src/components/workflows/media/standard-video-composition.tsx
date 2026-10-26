"use client";

import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";

import type { VideoStoryboard } from "@/types/video-workflow";
import {
  getSceneFrame,
  getTransitionFrameStyle,
  type StandardVideoScene,
  type StandardVideoSource,
  type VideoTransition,
} from "@apcs/video-composition";

export type StandardVideoPreviewProps = {
  storyboard: VideoStoryboard;
  sources: Record<string, StandardVideoSource>;
  musicUrl?: string;
  musicDurationInFrames?: number;
};

const PreviewShot = ({
  scene,
  source,
  width,
  height,
  frame,
}: {
  scene: StandardVideoScene;
  source: StandardVideoSource;
  width: number;
  height: number;
  frame: number;
}) => {
  const { crop, opacity, rotation, scale, containScale } = getSceneFrame(scene, frame);
  const inset = Math.round(Math.min(width, height) * 0.074);
  const captionBottom = Math.round(height * 0.079);
  const captionFontSize = Math.round(Math.min(width, height) * 0.048);
  // This deliberately mirrors VideoTimelineEditor's Preview. `crop` is the normalized output
  // viewport picked in the keyframe editor, so it must be expanded to fill the output canvas
  // rather than rescaled again from the source image's intrinsic dimensions.
  const style =
    scene.motion === "contain_gentle"
      ? {
          width: "100%",
          height: "100%",
          objectFit: "contain" as const,
          transform: `translate3d(0, 0, 0) scale(${containScale * scale}) rotate(${rotation}deg)`,
          transformOrigin: "center",
          willChange: "transform",
        }
      : {
          position: "absolute" as const,
          width: `${100 / crop.width}%`,
          height: `${100 / crop.height}%`,
          maxWidth: "none",
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
          objectFit: "fill" as const,
          transform: `translate3d(0, 0, 0) scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center",
          willChange: "transform",
        };
  return (
    <AbsoluteFill style={{ backgroundColor: "#111827", overflow: "hidden", opacity }}>
      {/* The storyboard timeline already controls frame visibility, so this image does not need a
          second media sequence. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={source.url} src={source.url} alt="" draggable={false} style={style} />
      {scene.text && (
        <div
          style={{
            position: "absolute",
            bottom: captionBottom,
            left: inset,
            right: inset,
            padding: `${Math.round(captionFontSize * 0.54)}px ${Math.round(captionFontSize * 0.69)}px`,
            backgroundColor: "rgba(0,0,0,.72)",
            color: "white",
            fontSize: captionFontSize,
            lineHeight: 1.35,
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          {scene.text}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const StandardVideoPreview = ({
  storyboard,
  sources,
  musicUrl,
  musicDurationInFrames,
}: StandardVideoPreviewProps) => {
  const frame = useCurrentFrame();
  let offset = 0;
  const fallbackOverlap = storyboard.transitionOverlapFrames ?? 0;
  const legacy = storyboard.outputDurationFrames == null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#111827" }}>
      {storyboard.scenes.map((scene, index) => {
        const overlapFrames = scene.transitionFrames ?? fallbackOverlap;
        const from = legacy ? Math.max(0, offset - overlapFrames) : offset;
        offset = legacy ? from + scene.durationFrames : offset + scene.durationFrames;
        const nextOverlapFrames =
          storyboard.scenes[index + 1]?.transitionFrames ?? fallbackOverlap;
        const renderDuration = legacy ? scene.durationFrames : scene.durationFrames + nextOverlapFrames;
        const localFrame = frame - from;
        if (localFrame < 0 || localFrame >= renderDuration) return null;
        const source = sources[scene.mockupId];
        if (!source) throw new Error("Missing storyboard preview source");
        return (
          <TransitionLayer
            key={`${scene.sceneOrder}-${scene.mockupId}`}
            frame={localFrame}
            sceneIndex={index}
            durationFrames={scene.durationFrames}
            transitionIn={scene.transition}
            transitionOut={storyboard.scenes[index + 1]?.transition ?? "none"}
            overlapFrames={overlapFrames}
            nextOverlapFrames={nextOverlapFrames}
            legacy={legacy}
          >
            <PreviewShot
              scene={scene}
              source={source}
              width={storyboard.width}
              height={storyboard.height}
              frame={Math.min(localFrame, scene.durationFrames - 1)}
            />
          </TransitionLayer>
        );
      })}
      <PreviewOverlays storyboard={storyboard} />
      <PreviewMusic
        storyboard={storyboard}
        musicUrl={musicUrl}
        musicDurationInFrames={musicDurationInFrames}
      />
    </AbsoluteFill>
  );
};

const PreviewMusic = ({
  storyboard,
  musicUrl,
  musicDurationInFrames,
}: {
  storyboard: VideoStoryboard;
  musicUrl?: string;
  musicDurationInFrames?: number;
}) => {
  const music = storyboard.videoEdit?.music;
  if (!music || music.muted || !musicUrl) return null;

  const durationInFrames = storyboard.outputDurationFrames ?? storyboard.durationSeconds * 30;
  const playbackFrames = Math.max(0, durationInFrames - music.startFrame);
  if (playbackFrames === 0) return null;
  const shouldLoop = Boolean(
    music.loop &&
      musicDurationInFrames &&
      music.sourceOffsetFrames + playbackFrames > musicDurationInFrames
  );

  return (
    <Sequence from={music.startFrame} durationInFrames={playbackFrames}>
      <Audio
        src={musicUrl}
        trimBefore={music.sourceOffsetFrames}
        loop={shouldLoop}
        pauseWhenBuffering
        volume={(frame) => {
          const fadeIn = music.fadeInFrames
            ? Math.min(1, frame / music.fadeInFrames)
            : 1;
          const remainingFrames = playbackFrames - frame;
          const fadeOut = music.fadeOutFrames
            ? Math.min(1, Math.max(0, remainingFrames / music.fadeOutFrames))
            : 1;
          return music.volume * Math.min(fadeIn, fadeOut);
        }}
      />
    </Sequence>
  );
};

const PreviewOverlays = ({ storyboard }: { storyboard: VideoStoryboard }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {(storyboard.videoEdit?.overlays ?? [])
        .filter((item) => frame >= item.startFrame && frame < item.endFrame)
        .map((item) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: "78%",
              padding: item.type === "cta" ? "8px 14px" : "5px 9px",
              color: item.textColor,
              background:
                item.preset === "minimal" || item.preset === "outline"
                  ? "transparent"
                  : item.backgroundColor,
              border: item.preset === "outline" ? `2px solid ${item.textColor}` : undefined,
              borderRadius: item.preset === "pill" ? 999 : 6,
              fontFamily: "Arial, sans-serif",
              fontWeight: item.preset === "bold" || item.type === "cta" ? 700 : 500,
              fontSize: `${item.fontScale * 100}vmin`,
              lineHeight: 1.1,
              textAlign: item.align,
            }}
          >
            {item.text}
          </div>
        ))}
    </>
  );
};

const TransitionLayer = ({
  children,
  frame,
  sceneIndex,
  durationFrames,
  transitionIn,
  transitionOut,
  overlapFrames,
  nextOverlapFrames,
  legacy,
}: {
  children: React.ReactNode;
  frame: number;
  sceneIndex: number;
  durationFrames: number;
  transitionIn: VideoTransition;
  transitionOut: VideoTransition;
  overlapFrames: number;
  nextOverlapFrames: number;
  legacy: boolean;
}) => {
  let style = { opacity: 1, transform: "none", clipPath: "none", filter: "none", flashOpacity: 0 };
  if (legacy && transitionIn === "fade") {
    style = {
      ...style,
      opacity: Math.min(frame / 8, Math.max(0, (durationFrames - 1 - frame) / 8)),
    };
  } else if (!legacy && sceneIndex > 0 && frame < overlapFrames) {
    style = getTransitionFrameStyle(transitionIn, frame, overlapFrames, "incoming");
  } else if (
    !legacy &&
    transitionOut !== "none" &&
    transitionOut !== "cut" &&
    nextOverlapFrames > 0 &&
    frame >= durationFrames
  ) {
    const outgoing = getTransitionFrameStyle(
      transitionOut,
      frame - durationFrames,
      nextOverlapFrames,
      "outgoing"
    );
    style = { ...outgoing, flashOpacity: 0 };
  }
  return (
    <AbsoluteFill
      style={{
        opacity: style.opacity,
        transform: style.transform,
        clipPath: style.clipPath as React.CSSProperties["clipPath"],
        filter: style.filter,
      }}
    >
      {children}
      {style.flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: "white", opacity: style.flashOpacity }} />
      )}
    </AbsoluteFill>
  );
};
