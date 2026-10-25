"use client";

import { type ComponentRef, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clapperboard,
  Loader2,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame } from "remotion";

import { listMusicTracks, videoWorkflowKeys } from "@/api/video-workflow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  anchorPosition,
  cropAnchor,
  cropPosition,
  NumberInputWithSteppers,
  NumberStepperControls,
  positionedCrop,
  RotationDial,
  ScalePercentageInput,
  STANDARD_MOTION_OPTIONS,
} from "@/components/workflows/config-panel/fields/standard-motion-editor";
import type {
  AiVideoSceneOptions,
  GenerateVideoConfig,
  MockupAsset,
  Region,
  SceneMotion,
  VideoEditConfig,
  VideoOverlay,
  VideoTransition,
} from "@/types/video-workflow";
import { Player } from "@remotion/player";
import { useQuery } from "@tanstack/react-query";

const FPS = 30;
const CANVAS_ZOOM_MIN = 0.6;
const CANVAS_ZOOM_MAX = 1.6;
const CANVAS_ZOOM_STEP = 0.1;
const MUSIC_PREVIEW_CACHE = "apcs-music-preview-v1";
const FULL_REGION: Region = { x: 0, y: 0, width: 1, height: 1 };
const FAST_MOTION_CROP = 1 / 1.2;
const PUSH_PULL_SCALE = 1.1;
const TRANSITIONS: { value: VideoTransition; label: string }[] = [
  { value: "none", label: "Cut / none" },
  { value: "fade", label: "Fade" },
  { value: "swipe", label: "Swipe" },
  { value: "zoom", label: "Zoom" },
  { value: "flash", label: "Flash" },
  { value: "whip_pan", label: "Whip pan" },
  { value: "blur", label: "Blur" },
  { value: "cut", label: "Cut" },
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const blankEdit = (): VideoEditConfig => ({ version: 1, music: null, overlays: [] });
type MusicPreparation =
  | { status: "idle" }
  | { status: "loading"; trackName: string }
  | { status: "ready"; trackName: string; sourceUrl: string }
  | { status: "error"; trackName: string };

async function loadMusicPreview(url: string, signal: AbortSignal) {
  const cache = "caches" in window ? await caches.open(MUSIC_PREVIEW_CACHE).catch(() => null) : null;
  let response = cache ? await cache.match(url) : undefined;
  if (!response) {
    response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Music preview request failed (${response.status})`);
    void cache?.put(url, response.clone()).catch(() => undefined);
  }
  const audio = await response.blob();
  if (!audio.size) throw new Error("Music preview is empty");
  return audio;
}
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const sceneSourceFrames = (scene: AiVideoSceneOptions) =>
  Math.max(
    1,
    Math.round(
      scene.mode === "standard"
        ? (scene.displayDurationFrames ?? scene.durationSeconds * FPS)
        : scene.durationSeconds * FPS
    )
  );
const sceneTrim = (scene: AiVideoSceneOptions) => {
  const sourceFrames = sceneSourceFrames(scene);
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
  return { sourceFrames, minimumFrames, trimStartFrames, trimEndFrames };
};
const sceneFrames = (scene: AiVideoSceneOptions) => {
  const { sourceFrames, trimStartFrames, trimEndFrames } = sceneTrim(scene);
  return sourceFrames - trimStartFrames - trimEndFrames;
};
const sceneProgress = (scene: AiVideoSceneOptions, localFrame: number) => {
  const { sourceFrames, trimStartFrames } = sceneTrim(scene);
  return Math.min(1, (localFrame + trimStartFrames) / Math.max(1, sourceFrames - 1));
};
const transitionFrames = (scene: AiVideoSceneOptions, index: number) =>
  index && scene.transitionIn && !["none", "cut"].includes(scene.transitionIn)
    ? (scene.transitionDurationFrames ?? 12)
    : 0;
const total = (scenes: AiVideoSceneOptions[]) =>
  scenes.reduce(
    (sum, scene, index) => sum + sceneFrames(scene) - transitionFrames(scene, index),
    0
  );
const seconds = (frames: number) => `${(frames / FPS).toFixed(frames % FPS ? 1 : 0)}s`;
const timecode = (frames: number) => {
  const totalSeconds = Math.max(0, Math.floor(frames / FPS));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};
const interpolate = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;
const mixRegion = (start: Region, end: Region, progress: number): Region => ({
  x: interpolate(start.x, end.x, progress),
  y: interpolate(start.y, end.y, progress),
  width: interpolate(start.width, end.width, progress),
  height: interpolate(start.height, end.height, progress),
});
const pan = (bounds: Region, horizontal: -1 | 0 | 1, vertical: -1 | 0 | 1): [Region, Region] => {
  const width = bounds.width * FAST_MOTION_CROP;
  const height = bounds.height * FAST_MOTION_CROP;
  const horizontalTravel = bounds.width - width;
  const verticalTravel = bounds.height - height;
  const startX =
    bounds.x + (horizontal > 0 ? 0 : horizontal < 0 ? horizontalTravel : horizontalTravel / 2);
  const startY = bounds.y + (vertical > 0 ? 0 : vertical < 0 ? verticalTravel : verticalTravel / 2);
  const endX =
    bounds.x + (horizontal > 0 ? horizontalTravel : horizontal < 0 ? 0 : horizontalTravel / 2);
  const endY = bounds.y + (vertical > 0 ? verticalTravel : vertical < 0 ? 0 : verticalTravel / 2);
  return [
    { x: startX, y: startY, width, height },
    { x: endX, y: endY, width, height },
  ];
};
const contains = (outer: Region, inner: Region) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;
const aspectForFormat = (format: GenerateVideoConfig["outputFormat"]) =>
  format === "square" ? [1, 1] : format === "landscape" ? [16, 9] : [9, 16];
function standardMotionFrames(motion: string, base: Region): [Region, Region] {
  if (motion === "contain_gentle") return [FULL_REGION, FULL_REGION];
  if (
    motion === "gentle" ||
    motion === "zoom" ||
    motion === "rotate_zoom_cw" ||
    motion === "rotate_zoom_ccw"
  )
    return [base, base];
  if (motion === "zoom_out") return [base, base];
  if (motion === "pan") return pan(base, 1, 0);
  if (motion === "pan_left") return pan(base, -1, 0);
  if (motion === "pan_up") return pan(base, 0, -1);
  if (motion === "pan_down") return pan(base, 0, 1);
  if (motion === "diagonal_up_right") return pan(base, 1, -1);
  if (motion === "diagonal_up_left") return pan(base, -1, -1);
  if (motion === "diagonal_down_right") return pan(base, 1, 1);
  if (motion === "diagonal_down_left") return pan(base, -1, 1);
  return [base, base];
}
function defaultBaseCrop(image: MockupAsset, aspectRatio: number): Region {
  const sourceRatio = image.width / Math.max(1, image.height);
  const height = sourceRatio < aspectRatio ? sourceRatio / aspectRatio : 1;
  const width = sourceRatio > aspectRatio ? aspectRatio / sourceRatio : 1;
  const focal = image.regions.focalPoint ?? { x: 0.5, y: 0.5 };
  return {
    x: Math.min(Math.max(focal.x - width / 2, 0), 1 - width),
    y: Math.min(Math.max(focal.y - height / 2, 0), 1 - height),
    width,
    height,
  };
}
function getStandardFrame(
  scene: TimelineScene,
  image: MockupAsset,
  index: number,
  progress: number,
  config: GenerateVideoConfig,
  aspectRatio: number
) {
  const base = scene.standardBaseCrop ?? defaultBaseCrop(image, aspectRatio);
  const hasCustomFrame = Boolean(
    scene.standardStartCrop ||
      scene.standardEndCrop ||
      scene.standardBaseCrop ||
      scene.standardStartScale != null ||
      scene.standardEndScale != null ||
      scene.standardStartRotation != null ||
      scene.standardEndRotation != null
  );
  let motion: string =
    scene.standardMotionPreset ??
    config.sceneMotionPresets?.[index] ??
    config.standardOptions?.motionPreset ??
    "zoom";
  if (motion === "varied")
    motion = ["zoom", "pan_left", "diagonal_up_right", "zoom_out"][index % 4]!;

  let startCrop: Region;
  let endCrop: Region;
  let startScale = 1;
  let endScale = 1;
  let startRotation = 0;
  let endRotation = 0;
  let containMotion = motion === "contain_gentle";
  if (hasCustomFrame) {
    startCrop = scene.standardStartCrop ?? base;
    endCrop = scene.standardEndCrop ?? startCrop;
    startScale = scene.standardStartScale ?? 1;
    endScale = scene.standardEndScale ?? 1;
    startRotation = scene.standardStartRotation ?? 0;
    endRotation = scene.standardEndRotation ?? 0;
  } else {
    if (motion !== "contain_gentle" && motion !== "static") {
      const protectedRegion =
        image.role === "ArtworkDetail"
          ? (image.regions.detail ?? image.regions.artwork ?? image.regions.product)
          : image.regions.product;
      if (protectedRegion && !contains(base, protectedRegion)) {
        motion = "contain_gentle";
        containMotion = true;
      }
    }
    [startCrop, endCrop] = standardMotionFrames(motion, base);
    if (motion === "gentle" || motion === "zoom") endScale = PUSH_PULL_SCALE;
    if (motion === "zoom_out") startScale = PUSH_PULL_SCALE;
    if (motion === "rotate_cw" || motion === "rotate_zoom_cw") endRotation = 12;
    if (motion === "rotate_ccw" || motion === "rotate_zoom_ccw") endRotation = -12;
    if (endRotation !== 0) {
      const radians = (12 * Math.PI) / 180;
      const rotationCoverScale = Math.min(
        5,
        Math.max(
          Math.cos(radians) + Math.sin(radians) / aspectRatio,
          Math.cos(radians) + Math.sin(radians) * aspectRatio
        ) * 1.01
      );
      startScale = rotationCoverScale;
      endScale = rotationCoverScale *
        (motion === "rotate_zoom_cw" || motion === "rotate_zoom_ccw" ? PUSH_PULL_SCALE : 1);
    }
  }
  return {
    crop: mixRegion(startCrop, endCrop, progress),
    scale:
      interpolate(startScale, endScale, progress) * (containMotion ? 0.97 + 0.03 * progress : 1),
    rotation: interpolate(startRotation, endRotation, progress),
    contain: containMotion,
  };
}
type Selection =
  | { kind: "overlay"; id: string }
  | { kind: "music" }
  | { kind: "scene"; sceneIndex: number }
  | { kind: "transition"; sceneIndex: number }
  | null;
type TimelineScene = NonNullable<GenerateVideoConfig["aiScenes"]>[number];

function sceneAtFrame(scenes: TimelineScene[], frame: number) {
  let offset = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]!;
    const end = offset + sceneFrames(scene);
    if (frame < end || index === scenes.length - 1)
      return { scene, index, localFrame: Math.max(0, frame - offset) };
    offset = end - transitionFrames(scenes[index + 1]!, index + 1);
  }
  return null;
}

function Preview({
  scenes,
  assets,
  edit,
  musicUrl,
  durationInFrames,
  selectedId,
  onSelect,
  config,
}: {
  scenes: TimelineScene[];
  assets: MockupAsset[];
  edit: VideoEditConfig;
  musicUrl?: string;
  durationInFrames: number;
  selectedId: string | null;
  onSelect: (value: Selection) => void;
  config: GenerateVideoConfig;
}) {
  const frame = useCurrentFrame();
  const activeScene = sceneAtFrame(scenes, frame);
  const current = activeScene?.scene;
  const currentIndex = activeScene?.index ?? 0;
  const localFrame = activeScene?.localFrame ?? 0;
  const image = assets.find((asset) => asset.id === current?.mockupId) ?? assets[0];
  const [ratioWidth, ratioHeight] = aspectForFormat(config.outputFormat);
  const aspectRatio = ratioWidth / ratioHeight;
  const progress = current ? sceneProgress(current, localFrame) : 0;
  const standardFrame =
    current?.mode === "standard" && image
      ? getStandardFrame(current, image, currentIndex, progress, config, aspectRatio)
      : null;
  return (
    <AbsoluteFill
      style={{
        background: "#090f1b",
        overflow: "hidden",
        border: "none",
        outline: "none",
        boxShadow: "none",
      }}
      onClick={() => onSelect(current ? { kind: "scene", sceneIndex: currentIndex } : null)}
    >
      {edit.music && !edit.music.muted && musicUrl && (
        <Sequence from={edit.music.startFrame}>
          <Audio
            src={musicUrl}
            startFrom={edit.music.sourceOffsetFrames}
            loop={edit.music.loop}
            volume={(localFrame) => {
              const fadeIn = edit.music!.fadeInFrames
                ? Math.min(1, localFrame / edit.music!.fadeInFrames)
                : 1;
              const remainingFrames = durationInFrames - edit.music!.startFrame - localFrame;
              const fadeOut = edit.music!.fadeOutFrames
                ? Math.min(1, Math.max(0, remainingFrames / edit.music!.fadeOutFrames))
                : 1;
              return edit.music!.volume * Math.min(fadeIn, fadeOut);
            }}
          />
        </Sequence>
      )}
      {image ? (
        standardFrame && !standardFrame.contain ? (
          <Img
            src={image.previewUrl}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: `${100 / standardFrame.crop.width}%`,
              height: `${100 / standardFrame.crop.height}%`,
              left: `${(-standardFrame.crop.x / standardFrame.crop.width) * 100}%`,
              top: `${(-standardFrame.crop.y / standardFrame.crop.height) * 100}%`,
              objectFit: "fill",
              transform: `translate3d(0, 0, 0) scale(${standardFrame.scale}) rotate(${standardFrame.rotation}deg)`,
              transformOrigin: "center",
              willChange: "transform",
            }}
          />
        ) : (
          <Img
            src={image.previewUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: standardFrame
                ? `translate3d(0, 0, 0) scale(${standardFrame.scale}) rotate(${standardFrame.rotation}deg)`
                : undefined,
              transformOrigin: "center",
              willChange: "transform",
            }}
          />
        )
      ) : (
        <AbsoluteFill style={{ display: "grid", placeItems: "center", color: "#94a3b8" }}>
          Choose a source image
        </AbsoluteFill>
      )}
      {edit.overlays
        .filter((item) => frame >= item.startFrame && frame < item.endFrame)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ kind: "overlay", id: item.id });
            }}
            style={{
              position: "absolute",
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: "80%",
              padding: item.type === "cta" ? "8px 14px" : "5px 9px",
              color: item.textColor,
              background:
                item.preset === "minimal" || item.preset === "outline"
                  ? "transparent"
                  : item.backgroundColor,
              border: item.preset === "outline" ? `2px solid ${item.textColor}` : "none",
              borderRadius: item.preset === "pill" ? 999 : 6,
              fontWeight: item.preset === "bold" || item.type === "cta" ? 700 : 500,
              fontSize: `${item.fontScale * 100}vmin`,
              lineHeight: 1.1,
              textAlign: item.align,
              outline: selectedId === item.id ? "2px solid #2563eb" : undefined,
              outlineOffset: 4,
            }}
          >
            {item.text}
          </button>
        ))}
    </AbsoluteFill>
  );
}

type SceneTransformEndpoint = "start" | "end";
type SceneTransformGesture =
  | {
      kind: "move";
      pointerId: number;
      crop: Region;
      startX: number;
      startY: number;
      width: number;
      height: number;
      scale: number;
    }
  | { kind: "scale"; pointerId: number; scale: number; startDistance: number }
  | { kind: "rotate"; pointerId: number; angle: number; rotation: number };

function SceneTransformOverlay({
  scene,
  sceneIndex,
  image,
  progress,
  config,
  onBegin,
  onChange,
}: {
  scene: TimelineScene;
  sceneIndex: number;
  image: MockupAsset;
  progress: number;
  config: GenerateVideoConfig;
  onBegin: () => void;
  onChange: (changes: Partial<TimelineScene>) => void;
}) {
  const gesture = useRef<SceneTransformGesture | null>(null);
  const selectionFrame = useRef<HTMLDivElement>(null);
  const [ratioWidth, ratioHeight] = aspectForFormat(config.outputFormat);
  const baseCrop = scene.standardBaseCrop ?? defaultBaseCrop(image, ratioWidth / ratioHeight);
  const endpoint: SceneTransformEndpoint = progress <= 0.5 ? "start" : "end";
  const start = getStandardFrame(scene, image, sceneIndex, 0, config, ratioWidth / ratioHeight);
  const end = getStandardFrame(scene, image, sceneIndex, 1, config, ratioWidth / ratioHeight);
  const active = endpoint === "start" ? start : end;
  const currentFrame = getStandardFrame(
    scene,
    image,
    sceneIndex,
    progress,
    config,
    ratioWidth / ratioHeight
  );

  const updateEndpoint = (crop: Region, scale: number, rotation: number) => {
    onChange({
      standardMotionPreset: "custom",
      standardBaseCrop: baseCrop,
      standardStartCrop: endpoint === "start" ? crop : start.crop,
      standardEndCrop: endpoint === "end" ? crop : end.crop,
      standardStartScale: endpoint === "start" ? scale : start.scale,
      standardEndScale: endpoint === "end" ? scale : end.scale,
      standardStartRotation: endpoint === "start" ? rotation : start.rotation,
      standardEndRotation: endpoint === "end" ? rotation : end.rotation,
    });
  };
  const move = (
    crop: Region,
    scale: number,
    horizontalPixels: number,
    verticalPixels: number,
    width: number,
    height: number
  ) =>
    updateEndpoint(
      {
        ...crop,
        x: Number(
          Math.max(
            -1,
            Math.min(1, crop.x - ((horizontalPixels / width) * crop.width) / Math.max(0.001, scale))
          ).toFixed(6)
        ),
        y: Number(
          Math.max(
            -1,
            Math.min(1, crop.y - ((verticalPixels / height) * crop.height) / Math.max(0.001, scale))
          ).toFixed(6)
        ),
      },
      scale,
      active.rotation
    );
  const startMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBegin();
    gesture.current = {
      kind: "move",
      pointerId: event.pointerId,
      crop: active.crop,
      scale: active.scale,
      startX: event.clientX,
      startY: event.clientY,
      width: bounds.width,
      height: bounds.height,
    };
  };
  const startScale = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = selectionFrame.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onBegin();
    gesture.current = {
      kind: "scale",
      pointerId: event.pointerId,
      scale: active.scale,
      startDistance: Math.max(
        1,
        Math.hypot(
          event.clientX - (bounds.left + bounds.width / 2),
          event.clientY - (bounds.top + bounds.height / 2)
        )
      ),
    };
  };
  const startRotation = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = selectionFrame.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onBegin();
    gesture.current = {
      kind: "rotate",
      pointerId: event.pointerId,
      angle:
        (Math.atan2(
          event.clientY - (bounds.top + bounds.height / 2),
          event.clientX - (bounds.left + bounds.width / 2)
        ) *
          180) /
        Math.PI,
      rotation: active.rotation,
    };
  };
  const handleMove = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (current.kind === "move") {
      move(
        current.crop,
        current.scale,
        event.clientX - current.startX,
        event.clientY - current.startY,
        current.width,
        current.height
      );
      return;
    }
    const bounds = selectionFrame.current?.getBoundingClientRect();
    if (!bounds) return;
    if (current.kind === "rotate") {
      const angle =
        (Math.atan2(
          event.clientY - (bounds.top + bounds.height / 2),
          event.clientX - (bounds.left + bounds.width / 2)
        ) *
          180) /
        Math.PI;
      const delta = ((angle - current.angle + 540) % 360) - 180;
      current.angle = angle;
      current.rotation = Math.max(-9999, Math.min(9999, current.rotation + delta));
      updateEndpoint(active.crop, active.scale, current.rotation);
      return;
    }
    const distance = Math.max(
      1,
      Math.hypot(
        event.clientX - (bounds.left + bounds.width / 2),
        event.clientY - (bounds.top + bounds.height / 2)
      )
    );
    updateEndpoint(
      active.crop,
      Math.max(0.01, Math.min(5, (current.scale * distance) / current.startDistance)),
      active.rotation
    );
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const amount: Record<string, [number, number]> = {
      ArrowLeft: [-0.025, 0],
      ArrowRight: [0.025, 0],
      ArrowUp: [0, -0.025],
      ArrowDown: [0, 0.025],
    };
    const delta = amount[event.key];
    if (!delta) return;
    event.preventDefault();
    onBegin();
    updateEndpoint(
      {
        ...active.crop,
        x: active.crop.x + delta[0] * active.crop.width,
        y: active.crop.y + delta[1] * active.crop.height,
      },
      active.scale,
      active.rotation
    );
  };

  return (
    <div
      ref={selectionFrame}
      role="button"
      tabIndex={0}
      aria-label={`Edit scene ${sceneIndex + 1} image. Drag to reposition, drag a corner to scale, or use arrow keys to move.`}
      onKeyDown={nudge}
      onPointerDown={startMove}
      onPointerMove={handleMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      className="border-primary focus-visible:ring-primary absolute z-20 cursor-grab touch-none border-2 outline-none focus-visible:ring-2 active:cursor-grabbing"
      style={
        currentFrame.contain
          ? {
              inset: 0,
              transform: `translate3d(0, 0, 0) scale(${currentFrame.scale}) rotate(${currentFrame.rotation}deg)`,
              transformOrigin: "center",
            }
          : {
              width: `${100 / currentFrame.crop.width}%`,
              height: `${100 / currentFrame.crop.height}%`,
              left: `${(-currentFrame.crop.x / currentFrame.crop.width) * 100}%`,
              top: `${(-currentFrame.crop.y / currentFrame.crop.height) * 100}%`,
              transform: `translate3d(0, 0, 0) scale(${currentFrame.scale}) rotate(${currentFrame.rotation}deg)`,
              transformOrigin: "center",
            }
      }
    >
      {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => (
        <button
          key={corner}
          type="button"
          aria-label={`Resize scene ${sceneIndex + 1} image from ${corner.replace("-", " ")}`}
          title="Drag to scale image"
          onPointerDown={startScale}
          onPointerMove={handleMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          className={`absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize appearance-none place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${corner.includes("right") ? "left-full" : "left-0"} ${corner.includes("bottom") ? "top-full" : "top-0"}`}
        >
          <span className="bg-primary size-3 rounded-full" />
        </button>
      ))}
      <button
        type="button"
        aria-label={`Rotate scene ${sceneIndex + 1} image`}
        title="Drag to rotate image"
        onPointerDown={startRotation}
        onPointerMove={handleMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="border-primary bg-card text-primary absolute top-[calc(100%+1.5rem)] left-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 shadow-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
          <path
            d="M19 8.5A8 8 0 1 0 20 14M19 4v4.5h-4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>
    </div>
  );
}

type Props = {
  disabled?: boolean;
  config: GenerateVideoConfig;
  assets: MockupAsset[];
  onSave: (config: GenerateVideoConfig) => void;
};
export function VideoTimelineEditor({ disabled, config, assets, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GenerateVideoConfig | null>(null);
  const [past, setPast] = useState<GenerateVideoConfig[]>([]);
  const [future, setFuture] = useState<GenerateVideoConfig[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [playing, setPlaying] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [musicPreparation, setMusicPreparation] = useState<MusicPreparation>({ status: "idle" });
  const [musicLoadAttempt, setMusicLoadAttempt] = useState(0);
  const player = useRef<ComponentRef<typeof Player>>(null);
  const previewCanvasRef = useRef<HTMLElement>(null);
  const { data: tracks = [] } = useQuery({
    queryKey: videoWorkflowKeys.music(),
    queryFn: listMusicTracks,
    enabled: open,
  });
  const active = draft ?? config;
  const scenes = active.aiScenes ?? [];
  const [previewWidth, previewHeight] = aspectForFormat(active.outputFormat);
  const edit = active.videoEdit ?? blankEdit();
  const frameTotal = Math.max(FPS, total(scenes));
  const overlay =
    selection?.kind === "overlay"
      ? edit.overlays.find((item) => item.id === selection.id)
      : undefined;
  const transitionIndex = selection?.kind === "transition" ? selection.sceneIndex : null;
  const transition = transitionIndex === null ? undefined : scenes[transitionIndex];
  const previewScene = sceneAtFrame(scenes, playhead);
  const selectedScene =
    selection?.kind === "scene"
      ? (() => {
          const scene = scenes[selection.sceneIndex];
          if (!scene) return undefined;
          return {
            scene,
            index: selection.sceneIndex,
            localFrame: previewScene?.index === selection.sceneIndex ? previewScene.localFrame : 0,
          };
        })()
      : undefined;
  const previewImage = selectedScene
    ? assets.find((asset) => asset.id === selectedScene.scene.mockupId)
    : previewScene
      ? assets.find((asset) => asset.id === previewScene.scene.mockupId)
      : undefined;
  const track = useMemo(
    () => tracks.find((item) => item.id === edit.music?.trackId),
    [tracks, edit.music?.trackId]
  );
  const musicIsPreparing = Boolean(edit.music && !edit.music.muted && musicPreparation.status !== "ready");
  const musicLoadFailed = Boolean(edit.music && musicPreparation.status === "error");
  const musicPreviewUrl = musicPreparation.status === "ready" ? musicPreparation.sourceUrl : undefined;
  const commit = useCallback((recipe: (current: GenerateVideoConfig) => GenerateVideoConfig) =>
    setDraft((current) => {
      if (!current) return current;
      setPast((history) => [...history.slice(-49), clone(current)]);
      setFuture([]);
      return recipe(clone(current));
    }), []);
  const updateEdit = useCallback(
    (recipe: (value: VideoEditConfig) => VideoEditConfig) =>
      commit((current) => ({ ...current, videoEdit: recipe(current.videoEdit ?? blankEdit()) })),
    [commit]
  );
  const retryMusicPreparation = () => setMusicLoadAttempt((attempt) => attempt + 1);
  const start = () => {
    setDraft(clone(config));
    setPast([]);
    setFuture([]);
    setSelection(null);
    setPlaying(false);
    setCanvasZoom(1);
    setPlayhead(0);
    setOpen(true);
  };
  const seekTo = (frame: number) => {
    const nextFrame = Math.max(0, Math.min(frameTotal - 1, Math.round(frame)));
    setPlaying(false);
    setPlayhead(nextFrame);
    player.current?.pause();
    player.current?.seekTo(nextFrame);
  };
  const togglePlayback = useCallback(() => {
    if (player.current?.isPlaying() ?? playing) {
      player.current?.pause();
      setPlaying(false);
      return;
    }
    if (musicIsPreparing || musicLoadFailed) return;
    player.current?.play();
    setPlaying(true);
  }, [musicIsPreparing, musicLoadFailed, playing]);
  useEffect(() => {
    if (!open || !edit.music || edit.music.muted) {
      setMusicPreparation({ status: "idle" });
      return;
    }
    if (!track) {
      setMusicPreparation({ status: "loading", trackName: "selected soundtrack" });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let objectUrl: string | undefined;
    let preload: HTMLAudioElement | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setMusicPreparation({ status: "loading", trackName: track.name });
    player.current?.pause();
    setPlaying(false);

    const prepare = async () => {
      let sourceUrl = track.previewUrl;
      try {
        const audioBlob = await loadMusicPreview(track.previewUrl, controller.signal);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(audioBlob);
        sourceUrl = objectUrl;
      } catch {
        if (controller.signal.aborted || cancelled) return;
        // Some CDN configurations allow media playback but block fetch() CORS requests.
        // Fall back to the CDN URL while still waiting until the browser can play it.
      }

      if (cancelled) return;
      const audioElement = new window.Audio();
      preload = audioElement;
      audioElement.preload = "auto";
      const ready = () => {
        if (cancelled) return;
        if (timeout) clearTimeout(timeout);
        setMusicPreparation({ status: "ready", trackName: track.name, sourceUrl });
      };
      const failed = () => {
        if (cancelled) return;
        if (timeout) clearTimeout(timeout);
        setMusicPreparation({ status: "error", trackName: track.name });
      };
      audioElement.addEventListener("canplay", ready, { once: true });
      audioElement.addEventListener("error", failed, { once: true });
      timeout = setTimeout(failed, 20_000);
      audioElement.src = sourceUrl;
      audioElement.load();
      if (audioElement.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) ready();
    };

    void prepare();
    return () => {
      cancelled = true;
      controller.abort();
      if (timeout) clearTimeout(timeout);
      preload?.pause();
      preload?.removeAttribute("src");
      preload?.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [edit.music, musicLoadAttempt, open, track]);
  const adjustCanvasZoom = (amount: number) =>
    setCanvasZoom((current) =>
      Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, Number((current + amount).toFixed(2))))
    );
  const cancel = () => {
    if (past.length && !window.confirm("Discard unsaved full-video edits?")) return;
    setOpen(false);
  };
  const undo = useCallback(() =>
    setPast((history) => {
      if (!history.length || !draft) return history;
      const next = history.at(-1)!;
      setFuture((items) => [...items, clone(draft)]);
      setDraft(clone(next));
      return history.slice(0, -1);
    }), [draft]);
  const redo = useCallback(() =>
    setFuture((history) => {
      if (!history.length || !draft) return history;
      const next = history.at(-1)!;
      setPast((items) => [...items, clone(draft)]);
      setDraft(clone(next));
      return history.slice(0, -1);
    }), [draft]);
  const addOverlay = (type: VideoOverlay["type"]) => {
    const item: VideoOverlay =
      type === "headline"
        ? {
            id: crypto.randomUUID(),
            type,
            text: "Your headline",
            startFrame: 0,
            endFrame: frameTotal,
            x: 0.5,
            y: 0.14,
            align: "center",
            preset: "clean",
            fontScale: 0.055,
            textColor: "#FFFFFF",
            backgroundColor: "#111827",
          }
        : {
            id: crypto.randomUUID(),
            type,
            text: "Shop now",
            startFrame: Math.max(0, frameTotal - 90),
            endFrame: frameTotal,
            x: 0.5,
            y: 0.85,
            align: "center",
            preset: "pill",
            fontScale: 0.04,
            textColor: "#FFFFFF",
            backgroundColor: "#2563EB",
          };
    updateEdit((value) => ({ ...value, overlays: [...value.overlays, item] }));
    setSelection({ kind: "overlay", id: item.id });
  };
  const changeOverlay = (changes: Partial<VideoOverlay>) => {
    if (!overlay) return;
    updateEdit((value) => ({
      ...value,
      overlays: value.overlays.map((item) =>
        item.id === overlay.id ? { ...item, ...changes } : item
      ),
    }));
  };
  const changeTransition = (changes: Partial<TimelineScene>) => {
    if (transitionIndex === null) return;
    commit((current) => ({
      ...current,
      aiScenes: (current.aiScenes ?? []).map((scene, index) =>
        index === transitionIndex ? { ...scene, ...changes } : scene
      ),
    }));
  };
  const beginSceneTransform = () => {
    if (!draft) return;
    setPast((history) => [...history.slice(-49), clone(draft)]);
    setFuture([]);
  };
  const beginTimelineSceneTrim = () => {
    if (!draft) return;
    setPast((history) => [...history.slice(-49), clone(draft)]);
    setFuture([]);
  };
  const changeTimelineSceneTrim = (sceneIndex: number, changes: Partial<TimelineScene>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            aiScenes: (current.aiScenes ?? []).map((scene, index) =>
              index === sceneIndex ? { ...scene, ...changes } : scene
            ),
          }
        : current
    );
  };
  const changeSelectedSceneTransform = (changes: Partial<TimelineScene>) => {
    if (!selectedScene) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            aiScenes: (current.aiScenes ?? []).map((scene, index) =>
              index === selectedScene.index ? { ...scene, ...changes } : scene
            ),
          }
        : current
    );
  };
  const resetSelectedSceneTransform = () => {
    if (!selectedScene) return;
    commit((current) => ({
      ...current,
      aiScenes: (current.aiScenes ?? []).map((scene, index) =>
        index === selectedScene.index
          ? {
              ...scene,
              standardMotionPreset: undefined,
              standardBaseCrop: undefined,
              standardStartCrop: undefined,
              standardEndCrop: undefined,
              standardStartScale: undefined,
              standardEndScale: undefined,
              standardStartRotation: undefined,
              standardEndRotation: undefined,
            }
          : scene
      ),
    }));
  };
  const save = () => {
    if (!draft) return;
    const videoEdit = clone(draft.videoEdit ?? blankEdit());
    if (draft.textOverlay.trim() && videoEdit.overlays.length === 0)
      videoEdit.overlays.push({
        id: crypto.randomUUID(),
        type: "headline",
        text: draft.textOverlay.trim(),
        startFrame: 0,
        endFrame: frameTotal,
        x: 0.5,
        y: 0.14,
        align: "center",
        preset: "clean",
        fontScale: 0.055,
        textColor: "#FFFFFF",
        backgroundColor: "#111827",
      });
    onSave({ ...draft, textOverlay: "", videoEdit });
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === "Escape") setSelection(null);
      else if (event.key === "Delete" && overlay) {
        updateEdit((value) => ({
          ...value,
          overlays: value.overlays.filter((item) => item.id !== overlay.id),
        }));
        setSelection(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, overlay, draft, redo, togglePlayback, undo, updateEdit]);
  useEffect(() => {
    if (!open || !player.current) return;
    const currentPlayer = player.current;
    const syncPlayhead = ({ detail }: { detail: { frame: number } }) => setPlayhead(detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlayhead(frameTotal - 1);
      setPlaying(false);
    };
    currentPlayer.addEventListener("frameupdate", syncPlayhead);
    currentPlayer.addEventListener("timeupdate", syncPlayhead);
    currentPlayer.addEventListener("play", onPlay);
    currentPlayer.addEventListener("pause", onPause);
    currentPlayer.addEventListener("ended", onEnded);
    return () => {
      currentPlayer.removeEventListener("frameupdate", syncPlayhead);
      currentPlayer.removeEventListener("timeupdate", syncPlayhead);
      currentPlayer.removeEventListener("play", onPlay);
      currentPlayer.removeEventListener("pause", onPause);
      currentPlayer.removeEventListener("ended", onEnded);
    };
  }, [open, frameTotal]);
  useEffect(() => {
    if (!open || playhead < frameTotal) return;
    const lastFrame = frameTotal - 1;
    player.current?.pause();
    player.current?.seekTo(lastFrame);
    setPlaying(false);
    setPlayhead(lastFrame);
  }, [frameTotal, open, playhead]);
  useEffect(() => {
    if (!open || !playing) return;
    let animationFrame = 0;
    const syncWhilePlaying = () => {
      const frame = player.current?.getCurrentFrame();
      if (typeof frame === "number")
        setPlayhead((current) => (current === frame ? current : frame));
      if (!player.current?.isPlaying()) {
        setPlaying(false);
        return;
      }
      animationFrame = requestAnimationFrame(syncWhilePlaying);
    };
    animationFrame = requestAnimationFrame(syncWhilePlaying);
    return () => cancelAnimationFrame(animationFrame);
  }, [open, playing]);
  useEffect(() => {
    const surface = previewCanvasRef.current;
    if (!open || !surface) return;
    const zoomWithWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      if (event.cancelable) event.preventDefault();
      const amount = event.deltaY < 0 ? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP;
      setCanvasZoom((current) =>
        Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, Number((current + amount).toFixed(2))))
      );
    };
    surface.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => surface.removeEventListener("wheel", zoomWithWheel);
  }, [open]);
  const tool = (
    icon: React.ReactNode,
    title: string,
    hint: string,
    click: () => void,
    activeTool = false
  ) => (
    <button
      type="button"
      onClick={click}
      aria-pressed={activeTool}
      className={`focus-visible:ring-primary flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none xl:min-h-12 xl:flex-row xl:justify-center xl:gap-2 xl:px-2 xl:py-1.5 xl:text-center ${activeTool ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-md xl:size-7 ${activeTool ? "bg-white/15" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 xl:w-auto">
        <span className="block text-sm font-semibold xl:text-[13px]">{title}</span>
        <span
          className={`mt-0.5 block truncate text-[11px] xl:hidden ${activeTool ? "text-primary-foreground/75" : "text-muted-foreground"}`}
        >
          {hint}
        </span>
      </span>
    </button>
  );
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 w-full justify-between gap-3 px-3 py-2 text-left"
        disabled={disabled || scenes.length === 0}
        onClick={start}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Clapperboard className="text-primary size-4 shrink-0" />
          <span className="truncate">Edit full video</span>
        </span>
        <span className="text-muted-foreground shrink-0 text-[11px] font-normal">
          Timeline, text, music
        </span>
      </Button>
      <Dialog open={open} onOpenChange={(value) => (value ? start() : cancel())}>
        <DialogContent
          showCloseButton={false}
          className="border-border bg-card text-card-foreground h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] xl:h-[min(90dvh,60rem)] xl:w-[min(96vw,88rem)] xl:max-w-[88rem]"
        >
          {draft && (
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
              <DialogHeader className="border-border bg-card flex-row items-center justify-between gap-4 border-b px-5 py-4 text-left sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                    <Clapperboard className="size-4" />
                  </span>
                  <div>
                    <DialogTitle className="text-foreground text-lg">Full video editor</DialogTitle>
                    <DialogDescription className="mt-1 text-sm">
                      {seconds(frameTotal)} · {scenes.length} scenes · 30 fps
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={!past.length}
                    onClick={undo}
                    aria-label="Undo"
                  >
                    <Undo2 />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={!future.length}
                    onClick={redo}
                    aria-label="Redo"
                  >
                    <Redo2 />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={cancel}
                    aria-label="Close editor"
                  >
                    <X />
                  </Button>
                  <Button type="button" size="sm" className="ml-2" onClick={save}>
                    Save changes
                  </Button>
                </div>
              </DialogHeader>
              <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
                <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-y-auto lg:overflow-hidden xl:grid-cols-[minmax(32rem,1.15fr)_minmax(22rem,0.85fr)_minmax(26rem,28rem)] xl:grid-rows-1">
                  <aside
                    className="border-border bg-card border-b p-3 lg:flex lg:items-start lg:gap-3 xl:grid xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden xl:border-r xl:border-b-0"
                    aria-label="Video editing tools"
                  >
                    <div>
                      <p className="text-muted-foreground mb-2 px-2 text-[11px] font-semibold tracking-[.12em] uppercase lg:hidden xl:block">
                        Add to video
                      </p>
                      <div className="grid flex-1 grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-4 xl:gap-1.5">
                        {tool(
                          <Type className="size-4" />,
                          "Headline",
                          "Title across scenes",
                          () => addOverlay("headline"),
                          overlay?.type === "headline"
                        )}
                        {tool(
                          <Zap className="size-4" />,
                          "Call to action",
                          "Button-style label",
                          () => addOverlay("cta"),
                          overlay?.type === "cta"
                        )}
                        {tool(
                          <Music2 className="size-4" />,
                          "Music",
                          track?.name ?? "Choose a soundtrack",
                          () => setSelection({ kind: "music" }),
                          selection?.kind === "music"
                        )}
                        {tool(
                          <SlidersHorizontal className="size-4" />,
                          "Transition",
                          "Select a boundary",
                          () =>
                            setSelection({
                              kind: "transition",
                              sceneIndex: Math.min(1, Math.max(0, scenes.length - 1)),
                            }),
                          selection?.kind === "transition"
                        )}
                      </div>
                    </div>
                    <div className="border-border mt-3 min-h-0 border-t pt-4 xl:mt-3 xl:overflow-y-auto">
                      {selection?.kind === "music" ? (
                        <MusicPicker
                          tracks={tracks}
                          edit={edit}
                          preparation={musicPreparation}
                          onChange={updateEdit}
                          onRetry={retryMusicPreparation}
                        />
                      ) : transition && transitionIndex !== null ? (
                        <TransitionPicker
                          scene={transition}
                          sceneNumber={transitionIndex + 1}
                          onChange={changeTransition}
                        />
                      ) : (
                        <OptionPickerEmpty />
                      )}
                    </div>
                  </aside>
                  <div className="grid min-h-0 min-w-0 lg:grid-cols-[minmax(28rem,1fr)_minmax(26rem,28rem)] lg:overflow-hidden xl:contents">
                    <section
                      ref={previewCanvasRef}
                      className="bg-muted/55 relative flex min-h-[25rem] min-w-0 items-center justify-center p-6 sm:p-8 lg:min-h-0 lg:p-8"
                      aria-label="Video preview canvas"
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-70"
                        style={{
                          backgroundImage:
                            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                          backgroundSize: "32px 32px",
                        }}
                      />
                      <div
                        className="relative z-10 max-h-full min-h-56 overflow-visible rounded-xl border-0 bg-transparent shadow-none ring-0 outline-none"
                        style={{
                          height: "min(72vh, 100%)",
                          aspectRatio: `${previewWidth} / ${previewHeight}`,
                          transform: `scale(${canvasZoom})`,
                          transformOrigin: "center",
                        }}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-xl border-0 ring-0 outline-none">
                          <Player
                            ref={player}
                            component={Preview}
                            inputProps={{
                              scenes,
                              assets,
                              edit,
                              musicUrl: musicPreviewUrl,
                              durationInFrames: frameTotal,
                              selectedId: overlay?.id ?? null,
                              onSelect: setSelection,
                              config: active,
                            }}
                            durationInFrames={frameTotal}
                            fps={FPS}
                            compositionWidth={previewWidth === 1 ? 1080 : previewWidth * 120}
                            compositionHeight={previewHeight === 1 ? 1080 : previewHeight * 120}
                            autoPlay={playing}
                            moveToBeginningWhenEnded={false}
                            controls={false}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "none",
                              outline: "none",
                              boxShadow: "none",
                            }}
                          />
                        </div>
                        {selectedScene?.scene.mode === "standard" && previewImage && (
                          <SceneTransformOverlay
                            scene={selectedScene.scene}
                            sceneIndex={selectedScene.index}
                            image={previewImage}
                            progress={sceneProgress(selectedScene.scene, selectedScene.localFrame)}
                            config={active}
                            onBegin={beginSceneTransform}
                            onChange={changeSelectedSceneTransform}
                          />
                        )}
                      </div>
                      <div
                        className="border-border bg-background/95 absolute right-4 bottom-4 z-20 flex items-center overflow-hidden rounded-lg border shadow-md backdrop-blur-sm"
                        role="group"
                        aria-label="Preview zoom controls"
                      >
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-foreground hover:bg-muted hover:translate-y-0"
                          disabled={canvasZoom <= CANVAS_ZOOM_MIN}
                          onClick={() => adjustCanvasZoom(-CANVAS_ZOOM_STEP)}
                          aria-label="Zoom out preview"
                          title="Zoom out"
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="border-border text-foreground min-w-12 border-x px-2 text-center text-xs font-semibold tabular-nums">
                          {Math.round(canvasZoom * 100)}%
                        </span>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-foreground hover:bg-muted hover:translate-y-0"
                          disabled={canvasZoom >= CANVAS_ZOOM_MAX}
                          onClick={() => adjustCanvasZoom(CANVAS_ZOOM_STEP)}
                          aria-label="Zoom in preview"
                          title="Zoom in"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </section>
                    <aside className="border-border bg-card h-full min-h-0 min-w-0 overflow-y-auto border-t p-5 lg:border-t-0 lg:border-l xl:p-6">
                      {overlay ? (
                        <OverlayInspector
                          overlay={overlay}
                          onChange={changeOverlay}
                          onDelete={() => {
                            updateEdit((value) => ({
                              ...value,
                              overlays: value.overlays.filter((item) => item.id !== overlay.id),
                            }));
                            setSelection(null);
                          }}
                        />
                      ) : selectedScene?.scene.mode === "standard" ? (
                        <SceneInspector
                          scene={selectedScene.scene}
                          sceneNumber={selectedScene.index + 1}
                          endpoint={
                            selectedScene.localFrame /
                              Math.max(1, sceneFrames(selectedScene.scene) - 1) <=
                            0.5
                              ? "start"
                              : "end"
                          }
                          onReset={resetSelectedSceneTransform}
                          onChange={changeSelectedSceneTransform}
                        />
                      ) : selection?.kind === "music" ? (
                        <MusicInspector
                          edit={edit}
                          preparation={musicPreparation}
                          onChange={updateEdit}
                          onRetry={retryMusicPreparation}
                        />
                      ) : transition && transitionIndex !== null ? (
                        <TransitionInspector
                          scene={transition}
                          sceneNumber={transitionIndex + 1}
                          onChange={changeTransition}
                        />
                      ) : (
                        <EmptyInspector />
                      )}
                    </aside>
                  </div>
                </div>
                <section className="border-border bg-muted/20 border-t px-4 py-2 sm:px-6">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="hover:bg-primary/10 hover:translate-y-0"
                        onClick={togglePlayback}
                        disabled={musicIsPreparing || musicLoadFailed}
                        aria-label={
                          musicIsPreparing
                            ? "Preparing selected music"
                            : musicLoadFailed
                              ? "Selected music could not be prepared"
                              : playing
                                ? "Pause preview"
                                : "Play preview"
                        }
                      >
                        {musicIsPreparing ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Play />}
                      </Button>
                      <span className="text-muted-foreground text-xs font-medium tabular-nums">
                        {(playhead / FPS).toFixed(2)} / {seconds(frameTotal)}
                      </span>
                      {musicPreparation.status === "loading" && (
                        <span className="text-muted-foreground hidden items-center gap-1.5 text-[11px] sm:flex" role="status">
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                          Preparing {musicPreparation.trackName}…
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground hidden text-[11px] sm:inline">
                      Click a boundary to edit its transition
                    </span>
                  </div>
                  <Timeline
                    scenes={scenes}
                    assets={assets}
                    edit={edit}
                    musicTrackName={track?.name ?? null}
                    totalFrames={frameTotal}
                    playhead={playhead}
                    selection={selection}
                    onSeek={seekTo}
                    onSelect={setSelection}
                    onBeginSceneTrim={beginTimelineSceneTrim}
                    onChangeSceneTrim={changeTimelineSceneTrim}
                  />
                </section>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyInspector() {
  return (
    <div className="flex h-full min-h-48 flex-col justify-center text-center">
      <span className="bg-primary/10 text-primary mx-auto grid size-10 place-items-center rounded-lg">
        <SlidersHorizontal className="size-5" />
      </span>
      <h2 className="text-foreground mt-3 text-base font-semibold">Select an element</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-6">
        Choose text, music, or a transition to edit its settings.
      </p>
    </div>
  );
}

function OptionPickerEmpty() {
  return (
    <div className="flex min-h-48 flex-col justify-center px-3 text-center">
      <h2 className="text-foreground text-base font-semibold">Choose an option</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-6">
        Select Music or Transition above to choose what you want to add.
      </p>
    </div>
  );
}

function SceneInspector({
  scene,
  sceneNumber,
  endpoint,
  onReset,
  onChange,
}: {
  scene: TimelineScene;
  sceneNumber: number;
  endpoint: SceneTransformEndpoint;
  onReset: () => void;
  onChange: (changes: Partial<TimelineScene>) => void;
}) {
  const baseCrop = scene.standardBaseCrop ?? FULL_REGION;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <Title icon={<SlidersHorizontal />} name="Transform" description={`Scene ${sceneNumber}`} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-9 shrink-0"
          onClick={onReset}
          aria-label="Reset image transform"
          title="Reset image transform"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <label className="text-muted-foreground block space-y-2 text-sm font-medium">
        <span>Camera movement</span>
        <Select
          value={scene.standardMotionPreset ?? "zoom"}
          onValueChange={(value) =>
            onChange(
              value === "custom"
                ? { standardMotionPreset: value as SceneMotion }
                : {
                    standardMotionPreset: value as SceneMotion,
                    standardBaseCrop: null,
                    standardStartCrop: null,
                    standardEndCrop: null,
                    standardStartScale: null,
                    standardEndScale: null,
                    standardStartRotation: null,
                    standardEndRotation: null,
                  }
            )
          }
        >
          <SelectTrigger className="border-input bg-background text-foreground h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STANDARD_MOTION_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {(["start", "end"] as const).map((frame) => {
        const fields =
          frame === "start"
            ? ({
                scale: "standardStartScale",
                rotation: "standardStartRotation",
                crop: "standardStartCrop",
              } as const)
            : ({
                scale: "standardEndScale",
                rotation: "standardEndRotation",
                crop: "standardEndCrop",
              } as const);
        const frameCrop = scene[fields.crop] ?? baseCrop;
        const scale = scene[fields.scale] ?? 1;
        const rotation = scene[fields.rotation] ?? 0;
        const position = cropPosition(baseCrop, frameCrop, scale);
        const changeFrame = (changes: Partial<TimelineScene>) =>
          onChange({ ...changes, standardMotionPreset: "custom" });
        const setPosition = (axis: "x" | "y", value: number) =>
          changeFrame({
            [fields.crop]: positionedCrop(
              baseCrop,
              frameCrop,
              scale,
              axis === "x" ? value : position.x,
              axis === "y" ? value : position.y
            ),
          });
        return (
          <section
            key={frame}
            className={`border-border bg-muted/30 space-y-4 rounded-xl border p-4 transition-shadow ${endpoint === frame ? "ring-primary/35 ring-2" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground flex items-center text-sm font-semibold">
                {frame === "start" ? "First frame" : "Last frame"}
                {endpoint === frame && (
                  <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-[10px]">
                    Editing
                  </span>
                )}
              </h3>
              <span className="bg-background text-muted-foreground rounded-md border px-2 py-1 text-[11px] font-medium tabular-nums">
                {frame === "start" ? "00:00" : `${scene.durationSeconds.toFixed(2)}s`}
              </span>
            </div>
            <label className="text-muted-foreground grid grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-2 text-xs">
              <span>Scale</span>
              <input
                type="range"
                min="0.01"
                max="5"
                step="0.01"
                value={scale}
                aria-label={`${frame} frame scale`}
                onChange={(event) => changeFrame({ [fields.scale]: Number(event.target.value) })}
                className="accent-primary h-8 min-w-0 cursor-pointer"
              />
              <ScalePercentageInput
                percentage={scale * 100}
                disabled={false}
                ariaLabel={`${frame} frame scale percentage`}
                onChange={(percentage) =>
                  changeFrame({ [fields.scale]: Math.min(5, Math.max(0.01, percentage / 100)) })
                }
              />
            </label>
            <div className="text-muted-foreground grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 text-xs">
              <span>Rotation</span>
              <div className="flex items-center gap-1.5">
                <div className="relative w-28">
                  <input
                    type="number"
                    min={-9999}
                    max={9999}
                    step="0.5"
                    value={rotation}
                    aria-label={`${frame} frame rotation in degrees`}
                    onChange={(event) =>
                      changeFrame({ [fields.rotation]: Number(event.target.value) })
                    }
                    className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/20 h-9 w-full appearance-none rounded-md border py-1 pr-7 pl-2 text-sm tabular-nums outline-none focus-visible:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                    °
                  </span>
                </div>
                <NumberStepperControls
                  value={rotation}
                  min={-9999}
                  max={9999}
                  step={1}
                  disabled={false}
                  ariaLabel={`${frame} frame rotation in degrees`}
                  onChange={(value) => changeFrame({ [fields.rotation]: value })}
                />
                <RotationDial
                  value={rotation}
                  min={-9999}
                  max={9999}
                  step={0.5}
                  disabled={false}
                  ariaLabel={`${frame} frame rotation dial`}
                  onChange={(value) => changeFrame({ [fields.rotation]: value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["x", "y"] as const).map((axis) => (
                <label
                  key={axis}
                  className="text-muted-foreground block space-y-1.5 text-xs font-medium"
                >
                  <span>{axis.toUpperCase()} position</span>
                  <NumberInputWithSteppers
                    value={position[axis]}
                    min={-100}
                    max={200}
                    disabled={false}
                    ariaLabel={`${frame} frame ${axis.toUpperCase()} position`}
                    onChange={(value) => setPosition(axis, value)}
                  />
                </label>
              ))}
            </div>
            <label className="text-muted-foreground block space-y-1.5 text-[11px] font-medium">
              <span>Position anchor</span>
              <Select
                value={cropAnchor(baseCrop, frameCrop, scale)}
                onValueChange={(anchor) => {
                  const point = anchorPosition(
                    anchor as "center" | "left" | "right" | "top" | "bottom"
                  );
                  changeFrame({
                    [fields.crop]: positionedCrop(baseCrop, frameCrop, scale, point.x, point.y),
                  });
                }}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["center", "left", "right", "top", "bottom"] as const).map((anchor) => (
                    <SelectItem key={anchor} value={anchor}>
                      {anchor[0]!.toUpperCase() + anchor.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </section>
        );
      })}
    </div>
  );
}
function Title({
  icon,
  name,
  description,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg [&_svg]:size-4">
        {icon}
      </span>
      <div>
        <h2 className="text-foreground text-base font-semibold">{name}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm font-normal"
      />
    </label>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground text-xs font-normal tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-primary w-full"
      />
    </label>
  );
}
function OverlayInspector({
  overlay,
  onChange,
  onDelete,
}: {
  overlay: VideoOverlay;
  onChange: (changes: Partial<VideoOverlay>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-5">
      <Title
        icon={<Type />}
        name={overlay.type === "cta" ? "Call to action" : "Headline"}
        description="Visible across any scene range."
      />
      <label className="block space-y-2 text-sm font-medium">
        Text
        <textarea
          value={overlay.text}
          maxLength={overlay.type === "cta" ? 40 : 120}
          onChange={(event) => onChange({ text: event.target.value })}
          className="border-input bg-background focus-visible:ring-ring min-h-24 w-full rounded-lg border p-3 text-sm font-normal outline-none focus-visible:ring-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="X position"
          value={overlay.x}
          step={0.01}
          onChange={(value) => onChange({ x: value })}
        />
        <NumberField
          label="Y position"
          value={overlay.y}
          step={0.01}
          onChange={(value) => onChange({ y: value })}
        />
      </div>
      <label className="block space-y-2 text-sm font-medium">
        Style
        <select
          value={overlay.preset}
          onChange={(event) => onChange({ preset: event.target.value as VideoOverlay["preset"] })}
          className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm font-normal"
        >
          <option value="clean">Clean</option>
          <option value="bold">Bold</option>
          <option value="minimal">Minimal</option>
          <option value="solid">Solid CTA</option>
          <option value="pill">Pill CTA</option>
          <option value="outline">Outline CTA</option>
        </select>
      </label>
      <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 />
        Delete
      </Button>
    </div>
  );
}
function MusicPicker({
  tracks,
  edit,
  preparation,
  onChange,
  onRetry,
}: {
  tracks: Awaited<ReturnType<typeof listMusicTracks>>;
  edit: VideoEditConfig;
  preparation: MusicPreparation;
  onChange: (recipe: (value: VideoEditConfig) => VideoEditConfig) => void;
  onRetry: () => void;
}) {
  const music = edit.music;
  const selectTrack = (trackId: string | null) =>
    onChange((value) => ({
      ...value,
      music: trackId
        ? {
            trackId,
            startFrame: 0,
            sourceOffsetFrames: 0,
            volume: 0.25,
            fadeInFrames: 15,
            fadeOutFrames: 15,
            loop: true,
            muted: false,
          }
        : null,
    }));
  return (
    <div className="space-y-4">
      <Title icon={<Music2 />} name="Choose music" description="One soundtrack for the complete video." />
      <label className="hidden">
        Track
        <select
          value={music?.trackId ?? ""}
          onChange={(event) =>
            onChange((value) => ({
              ...value,
              music: event.target.value
                ? {
                    trackId: event.target.value,
                    startFrame: 0,
                    sourceOffsetFrames: 0,
                    volume: 0.25,
                    fadeInFrames: 15,
                    fadeOutFrames: 15,
                    loop: true,
                    muted: false,
                  }
                : null,
            }))
          }
          className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm font-normal"
        >
          <option value="">No music</option>
          {tracks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.artistName}
            </option>
          ))}
        </select>
      </label>
      {music && preparation.status !== "idle" && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${preparation.status === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-muted-foreground"}`}
          role={preparation.status === "error" ? "alert" : "status"}
        >
          {preparation.status === "loading" ? (
            <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : preparation.status === "ready" ? (
            <Check className="text-primary size-3.5 shrink-0" aria-hidden="true" />
          ) : null}
          <span className="min-w-0 flex-1">
            {preparation.status === "loading"
              ? `Preparing ${preparation.trackName} for synchronized playback…`
              : preparation.status === "ready"
                ? `${preparation.trackName} is ready to play.`
                : `${preparation.trackName} could not be loaded.`}
          </span>
          {preparation.status === "error" && (
            <Button type="button" size="sm" variant="outline" className="h-7 shrink-0" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-2" role="list" aria-label="Music library">
        <button
          type="button"
          onClick={() => selectTrack(null)}
          aria-pressed={!music}
          className={`border-input focus-visible:ring-primary flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-dashed px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${!music ? "border-primary bg-primary/10 text-foreground" : "bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50"}`}
        >
          <span className="bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-md">
            <Music2 className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 font-medium">No music</span>
          {!music && <Check className="text-primary size-4 shrink-0" aria-hidden="true" />}
        </button>
        {tracks.map((item) => {
          const selected = music?.trackId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (selected ? onRetry() : selectTrack(item.id))}
              aria-pressed={selected}
              className={`group border-input focus-visible:ring-primary flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${selected ? "border-primary bg-primary/10 text-foreground shadow-sm" : "bg-background hover:border-primary/40 hover:bg-muted/50"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/15"}`}>
                <Music2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold tracking-tight">{item.name}</span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">{item.artistName}</span>
                <span className="text-muted-foreground mt-1 block text-[11px] font-medium">
                  {item.genre} · {item.mood} · {item.durationSeconds}s
                </span>
              </span>
              {selected && preparation.status === "loading" ? (
                <Loader2 className="text-primary size-4 shrink-0 animate-spin" aria-label="Preparing selected music" />
              ) : selected ? (
                <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
        {!tracks.length && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm leading-6">
            No licensed tracks are available yet.
          </p>
        )}
      </div>
    </div>
  );
}

function MusicInspector({
  edit,
  preparation,
  onChange,
  onRetry,
}: {
  edit: VideoEditConfig;
  preparation: MusicPreparation;
  onChange: (recipe: (value: VideoEditConfig) => VideoEditConfig) => void;
  onRetry: () => void;
}) {
  const music = edit.music;
  return (
    <div className="space-y-5">
      <Title icon={<Music2 />} name="Music settings" description="Adjust the selected soundtrack." />
      {music ? (
        <>
          {preparation.status === "loading" && (
            <p className="text-muted-foreground border-primary/20 bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" role="status">
              <Loader2 className="text-primary size-3.5 animate-spin" aria-hidden="true" />
              Preparing {preparation.trackName}. Playback will unlock when it is ready.
            </p>
          )}
          {preparation.status === "error" && (
            <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs" role="alert">
              <span>{preparation.trackName} could not be prepared.</span>
              <Button type="button" size="sm" variant="outline" className="h-7 shrink-0" onClick={onRetry}>
                Retry
              </Button>
            </div>
          )}
          <Range
            label="Volume"
            value={music.volume}
            min={0}
            max={1}
            step={0.05}
            display={`${Math.round(music.volume * 100)}%`}
            onChange={(value) =>
              onChange((current) => ({ ...current, music: { ...music, volume: value } }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Start (sec)"
              value={music.startFrame / FPS}
              min={0}
              step={0.1}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  music: { ...music, startFrame: Math.round(value * FPS) },
                }))
              }
            />
            <NumberField
              label="Source offset"
              value={music.sourceOffsetFrames / FPS}
              min={0}
              step={0.1}
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  music: { ...music, sourceOffsetFrames: Math.round(value * FPS) },
                }))
              }
            />
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm font-medium">
            <span>Loop soundtrack</span>
            <input
              type="checkbox"
              checked={music.loop}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  music: { ...music, loop: event.target.checked },
                }))
              }
            />
          </label>
        </>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm leading-6">
          Choose a licensed track from the library.
        </p>
      )}
    </div>
  );
}
function TransitionPicker({
  scene,
  sceneNumber,
  onChange,
}: {
  scene: TimelineScene;
  sceneNumber: number;
  onChange: (changes: Partial<TimelineScene>) => void;
}) {
  const effect = scene.transitionIn ?? "none";
  return (
    <div className="space-y-5">
      <Title
        icon={<Zap />}
        name="Choose transition"
        description={`Scene ${sceneNumber} boundary.`}
      />
      <label className="block space-y-2 text-sm font-medium">
        Effect
        <select
          value={effect}
          onChange={(event) => onChange({ transitionIn: event.target.value as VideoTransition })}
          className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm font-normal"
        >
          {TRANSITIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TransitionInspector({
  scene,
  sceneNumber,
  onChange,
}: {
  scene: TimelineScene;
  sceneNumber: number;
  onChange: (changes: Partial<TimelineScene>) => void;
}) {
  const effect = scene.transitionIn ?? "none";
  const frames = effect === "none" || effect === "cut" ? 0 : (scene.transitionDurationFrames ?? 12);
  return (
    <div className="space-y-5">
      <Title
        icon={<Zap />}
        name="Transition settings"
        description={`Scene ${sceneNumber} boundary.`}
      />
      {effect !== "none" && effect !== "cut" ? (
        <Range
          label="Duration"
          value={frames}
          min={1}
          max={30}
          step={1}
          display={seconds(frames)}
          onChange={(value) => onChange({ transitionDurationFrames: value })}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm leading-6">
          A cut has no overlap. Choose an effect to control its duration.
        </p>
      )}
    </div>
  );
}
function Timeline({
  scenes,
  assets,
  edit,
  musicTrackName,
  totalFrames,
  playhead,
  selection,
  onSeek,
  onSelect,
  onBeginSceneTrim,
  onChangeSceneTrim,
}: {
  scenes: TimelineScene[];
  assets: MockupAsset[];
  edit: VideoEditConfig;
  musicTrackName: string | null;
  totalFrames: number;
  playhead: number;
  selection: Selection;
  onSeek: (frame: number) => void;
  onSelect: (value: Selection) => void;
  onBeginSceneTrim: () => void;
  onChangeSceneTrim: (sceneIndex: number, changes: Partial<TimelineScene>) => void;
}) {
  const trimGesture = useRef<{
    pointerId: number;
    sceneIndex: number;
    edge: "start" | "end";
    startX: number;
    sceneWidth: number;
    sceneFrames: number;
    sourceFrames: number;
    minimumFrames: number;
    trimStartFrames: number;
    trimEndFrames: number;
    pendingTrimStartFrames: number;
    pendingTrimEndFrames: number;
    lastMovementFrames: number;
    dragged: boolean;
    changed: boolean;
  } | null>(null);
  const suppressEndpointClick = useRef(false);
  const timelineSeekGesture = useRef<{
    pointerId: number;
    startX: number;
    dragged: boolean;
  } | null>(null);
  const suppressSceneClick = useRef(false);
  const [pendingTrim, setPendingTrim] = useState<{
    sceneIndex: number;
    edge: "start" | "end";
    trimStartFrames: number;
    trimEndFrames: number;
  } | null>(null);
  const maxFrame = Math.max(0, totalFrames - 1);
  const currentFrame = Math.min(playhead, maxFrame);
  const playheadPercent = (currentFrame / Math.max(1, maxFrame)) * 100;
  const durationSeconds = Math.max(1, Math.ceil(totalFrames / FPS));
  const labelStepSeconds = Math.max(2, Math.ceil(durationSeconds / 6));
  const rulerTicks = Array.from({ length: Math.ceil(maxFrame / (FPS / 2)) + 1 }, (_, index) => {
    const frame = Math.min(maxFrame, index * (FPS / 2));
    const wholeSecond = frame % FPS === 0;
    const seconds = Math.floor(frame / FPS);
    const labeled = wholeSecond && seconds % labelStepSeconds === 0;
    return { frame, label: labeled ? timecode(frame) : null, major: wholeSecond };
  });
  const scenePlaybackStarts: number[] = [];
  let playbackOffset = 0;
  scenes.forEach((scene, index) => {
    scenePlaybackStarts.push(playbackOffset);
    const nextScene = scenes[index + 1];
    playbackOffset += sceneFrames(scene) - (nextScene ? transitionFrames(nextScene, index + 1) : 0);
  });
  const selectSceneFrame = (sceneIndex: number, endpoint: "start" | "end" = "start") => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const frame =
      scenePlaybackStarts[sceneIndex]! +
      (endpoint === "end"
        ? sceneFrames(scene) - 1
        : Math.min(sceneFrames(scene) - 1, transitionFrames(scene, sceneIndex)));
    onSeek(Math.min(maxFrame, Math.max(0, frame)));
    onSelect({ kind: "scene", sceneIndex });
  };
  const resolveTrim = (
    edge: "start" | "end",
    sourceFrames: number,
    minimumFrames: number,
    trimStartFrames: number,
    trimEndFrames: number,
    movementFrames: number
  ) => {
    const maximumTrim = sourceFrames - minimumFrames;
    const nextTrimStart =
      edge === "start"
        ? clamp(trimStartFrames + movementFrames, 0, maximumTrim - trimEndFrames)
        : trimStartFrames;
    const nextTrimEnd =
      edge === "end"
        ? clamp(trimEndFrames - movementFrames, 0, maximumTrim - trimStartFrames)
        : trimEndFrames;
    return {
      trimStartFrames: nextTrimStart,
      trimEndFrames: nextTrimEnd,
      changed: nextTrimStart !== trimStartFrames || nextTrimEnd !== trimEndFrames,
    };
  };
  const applyTrim = (
    sceneIndex: number,
    edge: "start" | "end",
    sourceFrames: number,
    minimumFrames: number,
    trimStartFrames: number,
    trimEndFrames: number,
    movementFrames: number,
    beforeChange?: () => void
  ) => {
    const next = resolveTrim(
      edge,
      sourceFrames,
      minimumFrames,
      trimStartFrames,
      trimEndFrames,
      movementFrames
    );
    if (!next.changed) return false;
    beforeChange?.();
    onChangeSceneTrim(sceneIndex, next);
    return true;
  };
  const beginSceneTrim = (
    event: PointerEvent<HTMLButtonElement>,
    sceneIndex: number,
    edge: "start" | "end"
  ) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    event.stopPropagation();
    event.preventDefault();
    const sceneElement = event.currentTarget.closest<HTMLElement>("[data-timeline-scene]");
    const bounds = sceneElement?.getBoundingClientRect();
    const trim = sceneTrim(scene);
    trimGesture.current = {
      pointerId: event.pointerId,
      sceneIndex,
      edge,
      startX: event.clientX,
      sceneWidth: Math.max(1, bounds?.width ?? 1),
      sceneFrames: sceneFrames(scene),
      ...trim,
      pendingTrimStartFrames: trim.trimStartFrames,
      pendingTrimEndFrames: trim.trimEndFrames,
      lastMovementFrames: 0,
      dragged: false,
      changed: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect({ kind: "scene", sceneIndex });
  };
  const moveSceneTrim = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = trimGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const movementPixels = event.clientX - gesture.startX;
    if (!gesture.changed && Math.abs(movementPixels) < 3) return;
    gesture.dragged = true;
    const movementFrames = Math.round((movementPixels / gesture.sceneWidth) * gesture.sceneFrames);
    if (movementFrames === gesture.lastMovementFrames) return;
    const next = resolveTrim(
      gesture.edge,
      gesture.sourceFrames,
      gesture.minimumFrames,
      gesture.trimStartFrames,
      gesture.trimEndFrames,
      movementFrames
    );
    gesture.lastMovementFrames = movementFrames;
    gesture.changed = next.changed;
    gesture.pendingTrimStartFrames = next.trimStartFrames;
    gesture.pendingTrimEndFrames = next.trimEndFrames;
    setPendingTrim({
      sceneIndex: gesture.sceneIndex,
      edge: gesture.edge,
      trimStartFrames: next.trimStartFrames,
      trimEndFrames: next.trimEndFrames,
    });
  };
  const finishSceneTrim = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = trimGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    trimGesture.current = null;
    setPendingTrim(null);
    suppressEndpointClick.current = true;
    if (gesture.changed) {
      onBeginSceneTrim();
      onChangeSceneTrim(gesture.sceneIndex, {
        trimStartFrames: gesture.pendingTrimStartFrames,
        trimEndFrames: gesture.pendingTrimEndFrames,
      });
    } else if (!gesture.dragged) selectSceneFrame(gesture.sceneIndex, gesture.edge);
  };
  const cancelSceneTrim = (event: PointerEvent<HTMLButtonElement>) => {
    if (trimGesture.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    trimGesture.current = null;
    setPendingTrim(null);
  };
  const nudgeSceneTrim = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    sceneIndex: number,
    edge: "start" | "end"
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const scene = scenes[sceneIndex];
    if (!scene) return;
    event.preventDefault();
    const trim = sceneTrim(scene);
    const movementFrames = (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? FPS : 1);
    applyTrim(
      sceneIndex,
      edge,
      trim.sourceFrames,
      trim.minimumFrames,
      trim.trimStartFrames,
      trim.trimEndFrames,
      movementFrames,
      onBeginSceneTrim
    );
    onSelect({ kind: "scene", sceneIndex });
  };
  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    onSeek(Math.round(ratio * maxFrame));
  };
  const beginTimelineSeek = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    timelineSeekGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event);
  };
  const moveTimelineSeek = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const gesture = timelineSeekGesture.current;
    if (gesture?.pointerId === event.pointerId && Math.abs(event.clientX - gesture.startX) > 3)
      gesture.dragged = true;
    seekFromPointer(event);
  };
  const endTimelineSeek = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (timelineSeekGesture.current?.pointerId === event.pointerId) {
      suppressSceneClick.current = timelineSeekGesture.current.dragged;
      timelineSeekGesture.current = null;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
      <div className="grid grid-rows-[1.5rem_3.5rem_2rem_2rem] gap-2">
        <span aria-hidden="true" />
        <span className="text-muted-foreground flex items-center text-xs font-medium">Scenes</span>
        <span className="text-muted-foreground flex items-center text-xs font-medium">Text</span>
        <span className="text-muted-foreground flex items-center text-xs font-medium">Music</span>
      </div>
      <div className="relative min-w-0">
        <div className="space-y-2">
          <div
            className="border-border relative h-6 overflow-hidden border-b"
            aria-label="Video time ruler"
          >
            {rulerTicks.map((tick, index) => (
              <span
                key={tick.frame}
                style={{ left: `${(tick.frame / Math.max(1, maxFrame)) * 100}%` }}
                className="absolute top-0 bottom-0"
              >
                {tick.label && (
                  <span
                    className={`text-foreground absolute top-0 text-[10px] font-semibold whitespace-nowrap tabular-nums ${index === 0 ? "left-0" : index === rulerTicks.length - 1 ? "right-0" : "-translate-x-1/2"}`}
                  >
                    {tick.label}
                  </span>
                )}
                <span
                  className={`absolute bottom-0 left-0 w-px ${tick.major ? "bg-primary/80 h-2" : "bg-foreground/40 h-1.5"}`}
                />
              </span>
            ))}
          </div>
          <div
            className="border-border bg-background relative h-14 cursor-ew-resize overflow-hidden rounded-lg border shadow-sm"
            onPointerDown={beginTimelineSeek}
            onPointerMove={moveTimelineSeek}
            onPointerUp={endTimelineSeek}
            title="Drag horizontally to move the playhead"
          >
            <div className="absolute inset-y-1.5 right-1.5 left-1.5 flex gap-1">
              {scenes.map((scene, index) => {
                const duration = Math.max(1, sceneFrames(scene) - transitionFrames(scene, index));
                const asset = assets.find((item) => item.id === scene.mockupId);
                const isSelected = selection?.kind === "scene" && selection.sceneIndex === index;
                const trim = sceneTrim(scene);
                const pending = pendingTrim?.sceneIndex === index ? pendingTrim : null;
                const startPreviewPercent = pending
                  ? clamp(
                      ((pending.trimStartFrames - trim.trimStartFrames) /
                        Math.max(1, sceneFrames(scene))) *
                        100,
                      0,
                      95
                    )
                  : 0;
                const endPreviewPercent = pending
                  ? clamp(
                      ((pending.trimEndFrames - trim.trimEndFrames) /
                        Math.max(1, sceneFrames(scene))) *
                        100,
                      0,
                      95
                    )
                  : 0;
                return (
                  <div
                    key={`${scene.mockupId}-${index}`}
                    data-timeline-scene
                    style={{ flex: `${duration} 1 0%` }}
                    className={`border-border bg-muted/60 group relative min-w-0 overflow-hidden rounded-sm border ${isSelected ? "ring-primary z-20 ring-2" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (suppressSceneClick.current) {
                          suppressSceneClick.current = false;
                          return;
                        }
                        selectSceneFrame(index);
                      }}
                      className="focus-visible:ring-ring absolute inset-0 z-10 size-full cursor-ew-resize focus-visible:ring-2 focus-visible:ring-inset"
                      aria-label={`Edit Scene ${index + 1} transform`}
                    >
                      <span className="sr-only">Select Scene {index + 1}</span>
                    </button>
                    {asset && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-75"
                        style={{
                          backgroundImage: `url(${JSON.stringify(asset.previewUrl)})`,
                          backgroundPosition: "center",
                          backgroundRepeat: "repeat-x",
                          backgroundSize: "7rem auto",
                        }}
                      />
                    )}
                    {startPreviewPercent > 0 && (
                      <span
                        aria-hidden="true"
                        className="border-primary/70 bg-background/70 pointer-events-none absolute inset-y-0 left-0 z-20 border-r"
                        style={{ width: `${startPreviewPercent}%` }}
                      />
                    )}
                    {endPreviewPercent > 0 && (
                      <span
                        aria-hidden="true"
                        className="border-primary/70 bg-background/70 pointer-events-none absolute inset-y-0 right-0 z-20 border-l"
                        style={{ width: `${endPreviewPercent}%` }}
                      />
                    )}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Scene {index + 1}
                    </span>
                    <button
                      type="button"
                      onPointerDown={(event) => beginSceneTrim(event, index, "start")}
                      onPointerMove={moveSceneTrim}
                      onPointerUp={finishSceneTrim}
                      onPointerCancel={cancelSceneTrim}
                      onKeyDown={(event) => nudgeSceneTrim(event, index, "start")}
                      onClick={() => {
                        if (suppressEndpointClick.current) {
                          suppressEndpointClick.current = false;
                          return;
                        }
                        selectSceneFrame(index, "start");
                      }}
                      style={
                        pending?.edge === "start" ? { left: `${startPreviewPercent}%` } : undefined
                      }
                      className="bg-background/95 text-primary focus-visible:ring-ring hover:bg-primary/15 active:bg-primary/20 absolute top-1/2 left-0 z-30 grid size-6 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full shadow-sm transition-colors focus-visible:ring-2"
                      aria-label={`Trim start of Scene ${index + 1}. Click to edit its first frame; use arrow keys to trim one frame.`}
                      title={`Drag to trim start of Scene ${index + 1}. Arrow keys trim by one frame; Shift + arrow trims by one second.`}
                    >
                      <span className="size-2 rotate-45 bg-current" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => beginSceneTrim(event, index, "end")}
                      onPointerMove={moveSceneTrim}
                      onPointerUp={finishSceneTrim}
                      onPointerCancel={cancelSceneTrim}
                      onKeyDown={(event) => nudgeSceneTrim(event, index, "end")}
                      onClick={() => {
                        if (suppressEndpointClick.current) {
                          suppressEndpointClick.current = false;
                          return;
                        }
                        selectSceneFrame(index, "end");
                      }}
                      style={
                        pending?.edge === "end" ? { right: `${endPreviewPercent}%` } : undefined
                      }
                      className="bg-background/95 text-primary focus-visible:ring-ring hover:bg-primary/15 active:bg-primary/20 absolute top-1/2 right-0 z-30 grid size-6 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full shadow-sm transition-colors focus-visible:ring-2"
                      aria-label={`Trim end of Scene ${index + 1}. Click to edit its last frame; use arrow keys to trim one frame.`}
                      title={`Drag to trim end of Scene ${index + 1}. Arrow keys trim by one frame; Shift + arrow trims by one second.`}
                    >
                      <span className="size-2 rotate-45 bg-current" />
                    </button>
                  </div>
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={maxFrame}
              step={1}
              value={currentFrame}
              aria-label="Full video timeline playhead"
              aria-valuetext={timecode(currentFrame)}
              onChange={(event) => onSeek(Number(event.currentTarget.value))}
              className="sr-only"
            />
          </div>
          <div className="border-border bg-background relative h-8 rounded-lg border">
            {edit.overlays.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect({ kind: "overlay", id: item.id })}
                style={{
                  left: `${(item.startFrame / totalFrames) * 100}%`,
                  width: `${Math.max(2, ((item.endFrame - item.startFrame) / totalFrames) * 100)}%`,
                }}
                className={`focus-visible:ring-ring absolute top-1 z-10 h-6 truncate rounded-md px-2 text-left text-[10px] font-semibold focus-visible:ring-2 ${selection?.kind === "overlay" && selection.id === item.id ? "bg-secondary text-secondary-foreground" : "bg-violet-600 text-white"}`}
              >
                {item.type === "cta" ? "CTA" : "Headline"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSelect({ kind: "music" })}
            aria-label={edit.music ? `Edit music: ${musicTrackName ?? "selected music"}` : "Choose music"}
            className={`focus-visible:ring-ring relative z-10 h-8 w-full rounded-lg border px-3 text-left text-[11px] focus-visible:ring-2 ${selection?.kind === "music" ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            {edit.music ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <Volume2 className="size-3 shrink-0" />
                <span className="truncate">{musicTrackName ?? "Selected music"}</span>
                <span className="text-primary/70 shrink-0">{Math.round(edit.music.volume * 100)}%</span>
              </span>
            ) : (
              "No music selected"
            )}
          </button>
        </div>
        <span
          className="bg-primary/90 pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 shadow-[0_0_0_1px_hsl(var(--background))]"
          style={{ left: `${playheadPercent}%` }}
          aria-hidden="true"
        >
          <span className="bg-primary absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[1px]" />
        </span>
      </div>
    </div>
  );
}
