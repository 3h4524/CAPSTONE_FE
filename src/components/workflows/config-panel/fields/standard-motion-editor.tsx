"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Diamond,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { AiVideoSceneOptions, MockupAsset, Region, SceneMotion } from "@/types/video-workflow";

export const STANDARD_MOTION_OPTIONS: ReadonlyArray<readonly [SceneMotion, string]> = [
  ["custom", "Default · manual"],
  ["zoom", "Push in"],
  ["zoom_out", "Pull back"],
  ["pan_left", "Pan left"],
  ["pan", "Pan right"],
  ["pan_up", "Move up"],
  ["pan_down", "Move down"],
  ["diagonal_up_left", "Diagonal up-left"],
  ["diagonal_up_right", "Diagonal up-right"],
  ["diagonal_down_left", "Diagonal down-left"],
  ["diagonal_down_right", "Diagonal down-right"],
  ["rotate_cw", "Rotate clockwise"],
  ["rotate_ccw", "Rotate counterclockwise"],
  ["rotate_zoom_cw", "Rotate clockwise + push in"],
  ["rotate_zoom_ccw", "Rotate counterclockwise + push in"],
  ["static", "Static"],
  ["contain_gentle", "Gentle full-frame motion"],
];

const FULL_FRAME: Region = { x: 0, y: 0, width: 1, height: 1 };
const ROTATION_LIMIT = 9999;
const SCALE_MIN = 0.01;
const SCALE_MAX = 5;
const FAST_MOTION_CROP = 1 / 1.2;
const PUSH_PULL_SCALE = 1.1;
const CANVAS_ZOOM_MIN = 1;
const CANVAS_ZOOM_MAX = 3;
const CANVAS_ZOOM_STEP = 0.1;

export const getStandardBaseCrop = (
  asset: Pick<MockupAsset, "width" | "height" | "regions"> | undefined,
  aspectRatio: string
): Region => {
  if (!asset) return FULL_FRAME;
  const [aspectWidth, aspectHeight] = aspectRatio.split(":").map(Number);
  const outputRatio = (aspectWidth || 9) / (aspectHeight || 16);
  const sourceRatio = asset.width / Math.max(1, asset.height);
  const height = sourceRatio < outputRatio ? sourceRatio / outputRatio : 1;
  const width = sourceRatio > outputRatio ? outputRatio / sourceRatio : 1;
  const focal = asset.regions.focalPoint ?? { x: 0.5, y: 0.5 };
  return {
    x: Math.min(Math.max(focal.x - width / 2, 0), 1 - width),
    y: Math.min(Math.max(focal.y - height / 2, 0), 1 - height),
    width,
    height,
  };
};

type Endpoint = "start" | "end";
type Anchor = "center" | "left" | "right" | "top" | "bottom";
type PreviewTransform =
  | {
      kind: "move";
      pointerId: number;
      endpoint: Endpoint;
      startX: number;
      startY: number;
      width: number;
      height: number;
      crop: Region;
      scale: number;
    }
  | { kind: "scale"; pointerId: number; endpoint: Endpoint; startDistance: number; scale: number }
  | { kind: "rotate"; pointerId: number; endpoint: Endpoint; angle: number; rotation: number };

const clampCanvasZoom = (value: number) =>
  Math.max(CANVAS_ZOOM_MIN, Math.min(CANVAS_ZOOM_MAX, Number(value.toFixed(2))));

export function NumberStepperControls({
  value,
  min,
  max,
  step,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  ariaLabel: string;
  onChange: (value: number) => void;
}) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const repeatDelayRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const clickResetRef = useRef<number | null>(null);
  const pointerActionRef = useRef(false);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const stopRepeating = () => {
    if (repeatDelayRef.current !== null) window.clearTimeout(repeatDelayRef.current);
    if (repeatIntervalRef.current !== null) window.clearInterval(repeatIntervalRef.current);
    repeatDelayRef.current = null;
    repeatIntervalRef.current = null;
  };

  useEffect(
    () => () => {
      if (repeatDelayRef.current !== null) window.clearTimeout(repeatDelayRef.current);
      if (repeatIntervalRef.current !== null) window.clearInterval(repeatIntervalRef.current);
      if (clickResetRef.current !== null) window.clearTimeout(clickResetRef.current);
    },
    []
  );

  const increment = (amount: number) => {
    const nextValue = Math.max(min, Math.min(max, valueRef.current + amount));
    if (nextValue === valueRef.current) return false;
    valueRef.current = nextValue;
    onChangeRef.current(nextValue);
    return true;
  };

  const startPress = (event: PointerEvent<HTMLButtonElement>, amount: number) => {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerActionRef.current = true;
    if (clickResetRef.current !== null) window.clearTimeout(clickResetRef.current);
    stopRepeating();
    if (!increment(amount)) return;

    repeatDelayRef.current = window.setTimeout(() => {
      repeatIntervalRef.current = window.setInterval(() => {
        if (!increment(amount)) stopRepeating();
      }, 80);
    }, 400);
  };

  const finishPress = (event: PointerEvent<HTMLButtonElement>) => {
    stopRepeating();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    clickResetRef.current = window.setTimeout(() => {
      pointerActionRef.current = false;
    }, 0);
  };

  const cancelPress = (event: PointerEvent<HTMLButtonElement>) => {
    finishPress(event);
    pointerActionRef.current = false;
  };

  const handleClick = (amount: number) => {
    if (pointerActionRef.current) {
      pointerActionRef.current = false;
      return;
    }
    increment(amount);
  };

  return (
    <span className="flex shrink-0 flex-col gap-0.5">
      <button
        type="button"
        disabled={disabled || value >= max}
        aria-label={`Increase ${ariaLabel}`}
        onPointerDown={(event) => startPress(event, step)}
        onPointerUp={finishPress}
        onPointerCancel={cancelPress}
        onLostPointerCapture={stopRepeating}
        onClick={() => handleClick(step)}
        className="border-input bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring/40 flex h-[17px] w-6 items-center justify-center rounded-t-sm border focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronUp aria-hidden="true" className="size-3" />
      </button>
      <button
        type="button"
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel}`}
        onPointerDown={(event) => startPress(event, -step)}
        onPointerUp={finishPress}
        onPointerCancel={cancelPress}
        onLostPointerCapture={stopRepeating}
        onClick={() => handleClick(-step)}
        className="border-input bg-background text-muted-foreground hover:bg-muted focus-visible:ring-ring/40 flex h-[17px] w-6 items-center justify-center rounded-b-sm border focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronDown aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

export function NumberInputWithSteppers({
  value,
  min,
  max,
  step = 1,
  disabled,
  ariaLabel,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  ariaLabel: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className={`border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/20 h-9 w-full appearance-none rounded-md border py-1 ${suffix ? "pr-7" : "px-3"} pl-2 text-sm tabular-nums outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
            {suffix}
          </span>
        )}
      </div>
      <NumberStepperControls
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        ariaLabel={ariaLabel}
        onChange={onChange}
      />
    </div>
  );
}

export function ScalePercentageInput({
  percentage,
  disabled,
  ariaLabel,
  onChange,
}: {
  percentage: number;
  disabled: boolean;
  ariaLabel: string;
  onChange: (percentage: number) => void;
}) {
  const displayValue = String(Number(percentage.toFixed(2)));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);

  return (
    <span className="relative block">
      <input
        type="text"
        inputMode="decimal"
        value={editing ? draft : displayValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onFocus={(event) => {
          setDraft(displayValue);
          setEditing(true);
          event.currentTarget.select();
        }}
        onBlur={() => setEditing(false)}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          const parsed = Number(next.replace(",", "."));
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/20 h-8 w-full appearance-none rounded-md border py-1 pr-5 pl-2 text-right text-xs font-semibold tabular-nums outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-xs">
        %
      </span>
    </span>
  );
}

export function RotationDial({
  value,
  min,
  max,
  step,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  ariaLabel: string;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ pointerId: number; angle: number; value: number } | null>(null);
  const clamp = (nextValue: number) => Math.max(min, Math.min(max, nextValue));
  const angleFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      ((Math.atan2(
        event.clientY - (bounds.top + bounds.height / 2),
        event.clientX - (bounds.left + bounds.width / 2)
      ) *
        180) /
        Math.PI +
        450) %
      360
    );
  };
  const setValue = (nextValue: number) => onChange(clamp(Math.round(nextValue / step) * step));
  const rotation = ((value % 360) + 360) % 360;

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, angle: angleFromPointer(event), value };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = drag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    const angle = angleFromPointer(event);
    const delta = ((angle - currentDrag.angle + 540) % 360) - 180;
    currentDrag.angle = angle;
    currentDrag.value = clamp(currentDrag.value + delta);
    setValue(currentDrag.value);
  };
  const finishDragging = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const adjustments: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    if (event.key === "Home") {
      event.preventDefault();
      setValue(min);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setValue(max);
      return;
    }
    if (adjustments[event.key] === undefined) return;
    event.preventDefault();
    setValue(value + adjustments[event.key]);
  };

  return (
    <button
      type="button"
      role="slider"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} degrees`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onKeyDown={onKeyDown}
      className="border-input bg-background text-primary hover:bg-muted focus-visible:ring-ring/40 flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-full border shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
    >
      <svg viewBox="0 0 40 40" className="size-8" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          className="stroke-muted-foreground/35"
          strokeWidth="1.5"
        />
        <g transform={`rotate(${rotation} 20 20)`}>
          <line
            x1="20"
            y1="20"
            x2="20"
            y2="8"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="20" cy="20" r="2.6" className="fill-primary" />
        </g>
      </svg>
    </button>
  );
}

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

const presetFrames = (motion: SceneMotion, base: Region): [Region, Region] => {
  if (motion === "contain_gentle") return [FULL_FRAME, FULL_FRAME];
  if (motion === "gentle" || motion === "zoom" || motion === "zoom_out") return [base, base];
  if (motion === "rotate_zoom_cw" || motion === "rotate_zoom_ccw") return [base, base];
  if (motion === "pan") return pan(base, 1, 0);
  if (motion === "pan_left") return pan(base, -1, 0);
  if (motion === "pan_up") return pan(base, 0, -1);
  if (motion === "pan_down") return pan(base, 0, 1);
  if (motion === "diagonal_up_right") return pan(base, 1, -1);
  if (motion === "diagonal_up_left") return pan(base, -1, -1);
  if (motion === "diagonal_down_right") return pan(base, 1, 1);
  if (motion === "diagonal_down_left") return pan(base, -1, 1);
  return [base, base];
};

const presetRotations = (motion: SceneMotion): [number, number] => {
  if (motion === "rotate_cw" || motion === "rotate_zoom_cw") return [0, 12];
  if (motion === "rotate_ccw" || motion === "rotate_zoom_ccw") return [0, -12];
  return [0, 0];
};

const rotationCoverScale = (aspectRatio: string) => {
  const [width, height] = aspectRatio.split(":").map(Number);
  const aspect = Math.max(0.01, (width || 9) / (height || 16));
  const radians = (12 * Math.PI) / 180;
  const cover = Math.max(
    Math.cos(radians) + Math.sin(radians) / aspect,
    Math.cos(radians) + Math.sin(radians) * aspect
  );
  return Math.min(SCALE_MAX, Number((cover * 1.01).toFixed(3)));
};

const presetScales = (motion: SceneMotion, aspectRatio: string): [number, number] => {
  let startScale = motion === "zoom_out" ? PUSH_PULL_SCALE : 1;
  let endScale = motion === "gentle" || motion === "zoom" ? PUSH_PULL_SCALE : 1;
  if (
    motion === "rotate_cw" ||
    motion === "rotate_ccw" ||
    motion === "rotate_zoom_cw" ||
    motion === "rotate_zoom_ccw"
  ) {
    const cover = rotationCoverScale(aspectRatio);
    startScale = cover;
    endScale =
      cover * (motion === "rotate_zoom_cw" || motion === "rotate_zoom_ccw" ? PUSH_PULL_SCALE : 1);
  }
  return [startScale, endScale];
};

const mixRegion = (start: Region, end: Region, progress: number): Region => ({
  x: start.x + (end.x - start.x) * progress,
  y: start.y + (end.y - start.y) * progress,
  width: start.width + (end.width - start.width) * progress,
  height: start.height + (end.height - start.height) * progress,
});

const clampRotation = (value: number) =>
  Math.max(-ROTATION_LIMIT, Math.min(ROTATION_LIMIT, Number.isFinite(value) ? value : 0));
const clampScale = (value: number) =>
  Math.max(SCALE_MIN, Math.min(SCALE_MAX, Number.isFinite(value) ? value : 1));
const visibleMotion = (motion: SceneMotion | null | undefined): SceneMotion =>
  motion === "gentle" || !motion ? "zoom" : motion;

export type StandardMotionPlan = {
  motion: SceneMotion;
  startCrop: Region;
  endCrop: Region;
  startScale: number;
  endScale: number;
  startRotation: number;
  endRotation: number;
};

export const resolveStandardMotionPlan = (
  scene: AiVideoSceneOptions,
  baseCrop: Region,
  aspectRatio: string
): StandardMotionPlan => {
  const motion = visibleMotion(scene.standardMotionPreset);
  const [presetStartCrop, presetEndCrop] = presetFrames(motion, baseCrop);
  const [presetStartRotation, presetEndRotation] = presetRotations(motion);
  const [presetStartScale, presetEndScale] = presetScales(motion, aspectRatio);
  return {
    motion,
    startCrop: motion === "custom" ? (scene.standardStartCrop ?? baseCrop) : presetStartCrop,
    endCrop: motion === "custom" ? (scene.standardEndCrop ?? baseCrop) : presetEndCrop,
    startScale: motion === "custom" ? clampScale(scene.standardStartScale ?? 1) : presetStartScale,
    endScale: motion === "custom" ? clampScale(scene.standardEndScale ?? 1) : presetEndScale,
    startRotation:
      motion === "custom" ? clampRotation(scene.standardStartRotation ?? 0) : presetStartRotation,
    endRotation:
      motion === "custom" ? clampRotation(scene.standardEndRotation ?? 0) : presetEndRotation,
  };
};

const cropZoom = (base: Region, crop: Region) =>
  Math.max(1, Math.min(1.2, base.width / Math.max(0.001, crop.width)));

export const cropPosition = (base: Region, crop: Region, scale: number) => {
  const safeScale = Math.max(0.001, scale);
  const horizontalTravel = Math.max(0, base.width - crop.width / safeScale);
  const verticalTravel = Math.max(0, base.height - crop.height / safeScale);
  const horizontalCenter = base.x + (base.width - crop.width) / 2;
  const verticalCenter = base.y + (base.height - crop.height) / 2;
  const horizontalRange = horizontalTravel < 0.000001 ? base.width : horizontalTravel;
  const verticalRange = verticalTravel < 0.000001 ? base.height : verticalTravel;
  return {
    x: Math.round(50 + ((crop.x - horizontalCenter) / horizontalRange) * 100),
    y: Math.round(50 + ((crop.y - verticalCenter) / verticalRange) * 100),
  };
};

export const cropAnchor = (base: Region, crop: Region, scale: number): Anchor => {
  const position = cropPosition(base, crop, scale);
  if (position.x <= 15) return "left";
  if (position.x >= 85) return "right";
  if (position.y <= 15) return "top";
  if (position.y >= 85) return "bottom";
  return "center";
};

export const positionedCrop = (
  base: Region,
  crop: Region,
  scale: number,
  x: number,
  y: number
): Region => {
  const safeScale = Math.max(0.001, scale);
  const horizontalTravel = Math.max(0, base.width - crop.width / safeScale);
  const verticalTravel = Math.max(0, base.height - crop.height / safeScale);
  const horizontalCenter = base.x + (base.width - crop.width) / 2;
  const verticalCenter = base.y + (base.height - crop.height) / 2;
  const horizontalRange = horizontalTravel < 0.000001 ? base.width : horizontalTravel;
  const verticalRange = verticalTravel < 0.000001 ? base.height : verticalTravel;
  return {
    ...crop,
    x: Number(
      Math.max(-1, Math.min(1, horizontalCenter + ((x - 50) / 100) * horizontalRange)).toFixed(6)
    ),
    y: Number(
      Math.max(-1, Math.min(1, verticalCenter + ((y - 50) / 100) * verticalRange)).toFixed(6)
    ),
  };
};

const moveCrop = (
  base: Region,
  crop: Region,
  scale: number,
  horizontalPixels: number,
  verticalPixels: number,
  frameWidth: number,
  frameHeight: number
): Region => {
  const safeScale = Math.max(0.001, scale);
  return {
    ...crop,
    x: Number(
      Math.max(
        -1,
        Math.min(1, crop.x - ((horizontalPixels / frameWidth) * crop.width) / safeScale)
      ).toFixed(6)
    ),
    y: Number(
      Math.max(
        -1,
        Math.min(1, crop.y - ((verticalPixels / frameHeight) * crop.height) / safeScale)
      ).toFixed(6)
    ),
  };
};

export const anchorPosition = (anchor: Anchor) =>
  anchor === "left"
    ? { x: 0, y: 50 }
    : anchor === "right"
      ? { x: 100, y: 50 }
      : anchor === "top"
        ? { x: 50, y: 0 }
        : anchor === "bottom"
          ? { x: 50, y: 100 }
          : { x: 50, y: 50 };

// A real editorial product shot gives pan, zoom, and rotation enough visual anchors to be understood
// before the seller has selected their own mock-up. It deliberately has generous context around the shirt.
const SAMPLE_PREVIEW_SOURCE = {
  previewUrl: "/images/motion-preview-sample.webp",
  width: 768,
  height: 1152,
};

export function StandardMotionPreview({
  scene,
  sceneNumber,
  baseCrop,
  source,
  aspectRatio,
}: Pick<
  StandardMotionEditorProps,
  "scene" | "sceneNumber" | "baseCrop" | "source" | "aspectRatio"
>) {
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const playheadRef = useRef(playhead);
  const previewSource = source ?? SAMPLE_PREVIEW_SOURCE;
  const { motion, startCrop, endCrop, startScale, endScale, startRotation, endRotation } =
    resolveStandardMotionPlan(scene, baseCrop, aspectRatio);
  const previewCrop = mixRegion(startCrop, endCrop, playhead);
  const previewScale = startScale + (endScale - startScale) * playhead;
  const previewRotation = startRotation + (endRotation - startRotation) * playhead;
  const [ratioWidth, ratioHeight] = aspectRatio.split(":").map(Number);
  const previewAspect = `${ratioWidth || 9} / ${ratioHeight || 16}`;
  const playbackDuration = Math.min(6000, Math.max(1000, scene.durationSeconds * 1000));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!playing || prefersReducedMotion) {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      return;
    }
    startedAtRef.current = performance.now() - playheadRef.current * playbackDuration;
    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAtRef.current) / playbackDuration);
      playheadRef.current = next;
      setPlayhead(next);
      if (next >= 1) setPlaying(false);
      else animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [playbackDuration, playing, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) setPlaying(false);
  }, [prefersReducedMotion]);

  useEffect(() => {
    setPlaying(false);
    playheadRef.current = 0;
    setPlayhead(0);
  }, [
    scene.standardEndCrop,
    scene.standardEndRotation,
    scene.standardEndScale,
    scene.standardMotionPreset,
    scene.standardStartCrop,
    scene.standardStartRotation,
    scene.standardStartScale,
    source?.id,
  ]);

  const startPreview = () => {
    if (prefersReducedMotion) return;
    playheadRef.current = 0;
    setPlayhead(0);
    setPlaying(true);
  };
  const stopPreview = () => {
    setPlaying(false);
    playheadRef.current = 0;
    setPlayhead(0);
  };

  return (
    <div
      role="button"
      tabIndex={prefersReducedMotion ? -1 : 0}
      aria-label={
        prefersReducedMotion
          ? `Scene ${sceneNumber} camera motion preview. Reduced motion is enabled.`
          : `Scene ${sceneNumber} camera motion preview. Hover, focus, or press Enter to play.`
      }
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
      onClick={startPreview}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          stopPreview();
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          startPreview();
        }
      }}
      className="focus-visible:ring-ring relative mr-auto ml-0 w-40 max-w-full cursor-pointer overflow-hidden rounded-md bg-black shadow-md outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ aspectRatio: previewAspect }}
    >
      {motion === "contain_gentle" ? (
        <Image
          src={previewSource.previewUrl}
          alt={
            source
              ? `Motion preview for scene ${sceneNumber}`
              : "Sample lifestyle product image demonstrating camera movement"
          }
          fill
          unoptimized
          sizes="320px"
          className="object-contain"
          draggable={false}
          style={{
            transform: `translate3d(0, 0, 0) scale(${(0.97 + 0.03 * playhead) * previewScale}) rotate(${previewRotation}deg)`,
            transformOrigin: "center",
            willChange: "transform",
          }}
        />
      ) : (
        <Image
          src={previewSource.previewUrl}
          alt={
            source
              ? `Motion preview for scene ${sceneNumber}`
              : "Sample lifestyle product image demonstrating camera movement"
          }
          width={previewSource.width}
          height={previewSource.height}
          unoptimized
          draggable={false}
          className="absolute max-w-none"
          style={{
            width: `${100 / previewCrop.width}%`,
            height: `${100 / previewCrop.height}%`,
            left: `${(-previewCrop.x / previewCrop.width) * 100}%`,
            top: `${(-previewCrop.y / previewCrop.height) * 100}%`,
            transform: `translate3d(0, 0, 0) scale(${previewScale}) rotate(${previewRotation}deg)`,
            transformOrigin: "center",
            willChange: "transform",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/25 ring-inset" />
    </div>
  );
}

type StandardMotionEditorProps = {
  scene: AiVideoSceneOptions;
  sceneNumber: number;
  baseCrop: Region;
  source?: MockupAsset;
  aspectRatio: string;
  disabled: boolean;
  hasRenderedVideo: boolean;
  onMotionPresetChange: (motion: SceneMotion) => void;
  onApply: (changes: Partial<AiVideoSceneOptions>) => void;
};

type MotionSettingsSnapshot = Pick<
  AiVideoSceneOptions,
  | "standardMotionPreset"
  | "standardBaseCrop"
  | "standardStartCrop"
  | "standardEndCrop"
  | "standardStartScale"
  | "standardEndScale"
  | "standardStartRotation"
  | "standardEndRotation"
>;

const motionSettingsSnapshot = (scene: AiVideoSceneOptions): MotionSettingsSnapshot => ({
  standardMotionPreset: scene.standardMotionPreset,
  standardBaseCrop: scene.standardBaseCrop,
  standardStartCrop: scene.standardStartCrop,
  standardEndCrop: scene.standardEndCrop,
  standardStartScale: scene.standardStartScale,
  standardEndScale: scene.standardEndScale,
  standardStartRotation: scene.standardStartRotation,
  standardEndRotation: scene.standardEndRotation,
});

export function StandardMotionEditor({
  scene,
  sceneNumber,
  baseCrop,
  source,
  aspectRatio,
  disabled,
  hasRenderedVideo,
  onMotionPresetChange,
  onApply,
}: StandardMotionEditorProps) {
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState<SceneMotion>(visibleMotion(scene.standardMotionPreset));
  const [startCrop, setStartCrop] = useState<Region>(baseCrop);
  const [endCrop, setEndCrop] = useState<Region>(baseCrop);
  const [startScale, setStartScale] = useState(1);
  const [endScale, setEndScale] = useState(1);
  const [startRotation, setStartRotation] = useState(0);
  const [endRotation, setEndRotation] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const previewCanvasRef = useRef<HTMLElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const previewTransformRef = useRef<PreviewTransform | null>(null);
  const savedMotionSettingsRef = useRef<MotionSettingsSnapshot | null>(null);
  const startedAtRef = useRef(0);
  const playheadRef = useRef(0);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [imageBounds, setImageBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    transform: string;
  } | null>(null);
  const durationMs = scene.durationSeconds * 1000;
  const adjustCanvasZoom = (amount: number) =>
    setCanvasZoom((current) => clampCanvasZoom(current + amount));

  const resetDraft = (nextMotion = visibleMotion(scene.standardMotionPreset)) => {
    const [presetStart, presetEnd] = presetFrames(nextMotion, baseCrop);
    const [presetStartRotation, presetEndRotation] = presetRotations(nextMotion);
    const [presetStartScale, presetEndScale] = presetScales(nextMotion, aspectRatio);
    setMotion(nextMotion);
    setStartCrop(nextMotion === "custom" ? (scene.standardStartCrop ?? baseCrop) : presetStart);
    setEndCrop(nextMotion === "custom" ? (scene.standardEndCrop ?? baseCrop) : presetEnd);
    setStartScale(
      nextMotion === "custom" ? clampScale(scene.standardStartScale ?? 1) : presetStartScale
    );
    setEndScale(nextMotion === "custom" ? clampScale(scene.standardEndScale ?? 1) : presetEndScale);
    setStartRotation(
      nextMotion === "custom"
        ? clampRotation(scene.standardStartRotation ?? 0)
        : presetStartRotation
    );
    setEndRotation(
      nextMotion === "custom" ? clampRotation(scene.standardEndRotation ?? 0) : presetEndRotation
    );
    setPlayhead(0);
    setPlaying(false);
  };

  useEffect(() => {
    if (!open) setPlaying(false);
    setCanvasZoom(1);
  }, [open]);

  const openEditor = () => {
    // Read the current selection from the outer Camera movement control at the
    // moment the editor opens. This keeps the preview and its first/last frames
    // aligned with a preset selected immediately before opening the dialog.
    savedMotionSettingsRef.current = motionSettingsSnapshot(scene);
    resetDraft(visibleMotion(scene.standardMotionPreset));
    setOpen(true);
  };

  const cancelEditor = () => {
    if (savedMotionSettingsRef.current) onApply(savedMotionSettingsRef.current);
    savedMotionSettingsRef.current = null;
    setOpen(false);
  };

  useEffect(() => {
    const surface = previewCanvasRef.current;
    if (!surface) return;
    const zoomWithWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      if (event.cancelable) event.preventDefault();
      setCanvasZoom((current) =>
        clampCanvasZoom(current + (event.deltaY < 0 ? CANVAS_ZOOM_STEP : -CANVAS_ZOOM_STEP))
      );
    };
    surface.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => surface.removeEventListener("wheel", zoomWithWheel);
  }, [open]);

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);

  useEffect(() => {
    if (!playing) {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      return;
    }
    startedAtRef.current = performance.now() - playheadRef.current * durationMs;
    const tick = (now: number) => {
      const next = Math.min(1, (now - startedAtRef.current) / durationMs);
      setPlayhead(next);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [durationMs, playing]);

  const previewCrop = useMemo(
    () => mixRegion(startCrop, endCrop, playhead),
    [endCrop, playhead, startCrop]
  );
  const previewScale = startScale + (endScale - startScale) * playhead;
  const previewRotation = startRotation + (endRotation - startRotation) * playhead;
  const activeEndpoint: Endpoint = playhead <= 0.5 ? "start" : "end";
  const customCropIsSafe = true;
  const [ratioWidth, ratioHeight] = aspectRatio.split(":").map(Number);
  const previewAspect = `${ratioWidth || 9} / ${ratioHeight || 16}`;

  useEffect(() => {
    const frame = previewFrameRef.current;
    const image = previewImageRef.current;
    if (!source || !frame || !image) {
      setImageBounds(null);
      return;
    }

    const syncImageBounds = () => {
      const computed = window.getComputedStyle(image);
      // Use the image's untransformed layout box and apply the same transform
      // to the selection. Its border and handles then follow the rotated layer
      // while remaining free to extend beyond the clipped video viewport.
      const next =
        image.offsetWidth <= 0 || image.offsetHeight <= 0
          ? null
          : {
              left: image.offsetLeft,
              top: image.offsetTop,
              width: image.offsetWidth,
              height: image.offsetHeight,
              transform: computed.transform === "none" ? "none" : computed.transform,
            };
      setImageBounds((current) =>
        current &&
        next &&
        Math.abs(current.left - next.left) < 0.5 &&
        Math.abs(current.top - next.top) < 0.5 &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5 &&
        current.transform === next.transform
          ? current
          : next
      );
    };

    syncImageBounds();
    const observer = new ResizeObserver(syncImageBounds);
    observer.observe(frame);
    observer.observe(image);
    window.addEventListener("resize", syncImageBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncImageBounds);
    };
  }, [canvasZoom, motion, playhead, previewCrop, previewRotation, previewScale, source]);

  const choosePreset = (value: string) => {
    const nextMotion = value as SceneMotion;
    const [nextStart, nextEnd] = presetFrames(nextMotion, baseCrop);
    const [nextStartRotation, nextEndRotation] = presetRotations(nextMotion);
    const [nextStartScale, nextEndScale] = presetScales(nextMotion, aspectRatio);
    setMotion(nextMotion);
    setStartCrop(nextStart);
    setEndCrop(nextEnd);
    setStartScale(nextStartScale);
    setEndScale(nextEndScale);
    setStartRotation(nextStartRotation);
    setEndRotation(nextEndRotation);
    setPlayhead(0);
    setPlaying(false);
    onMotionPresetChange(nextMotion);
  };

  const updateEndpoint = (endpoint: Endpoint, crop: Region) => {
    setMotion("custom");
    if (endpoint === "start") setStartCrop(crop);
    else setEndCrop(crop);
  };

  const updateRotation = (endpoint: Endpoint, value: number) => {
    setMotion("custom");
    if (endpoint === "start") setStartRotation(clampRotation(value));
    else setEndRotation(clampRotation(value));
  };

  const updateScale = (endpoint: Endpoint, value: number) => {
    setMotion("custom");
    if (endpoint === "start") setStartScale(clampScale(value));
    else setEndScale(clampScale(value));
  };

  const activeValues = (endpoint: Endpoint) =>
    endpoint === "start"
      ? { crop: startCrop, scale: startScale, rotation: startRotation }
      : { crop: endCrop, scale: endScale, rotation: endRotation };

  const stopPreview = (endpoint: Endpoint) => {
    setPlaying(false);
    setPlayhead(endpoint === "start" ? 0 : 1);
  };

  const previewTransformBounds = () => {
    return previewImageRef.current?.getBoundingClientRect();
  };

  const startPreviewDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!source || disabled || event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const endpoint = activeEndpoint;
    event.currentTarget.setPointerCapture(event.pointerId);
    stopPreview(endpoint);
    previewTransformRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      endpoint,
      startX: event.clientX,
      startY: event.clientY,
      width: bounds.width,
      height: bounds.height,
      crop: activeValues(endpoint).crop,
      scale: activeValues(endpoint).scale,
    };
  };

  const startPreviewScale = (event: PointerEvent<HTMLButtonElement>) => {
    if (!source || disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = previewTransformBounds();
    if (!bounds) return;
    const endpoint = activeEndpoint;
    event.currentTarget.setPointerCapture(event.pointerId);
    stopPreview(endpoint);
    previewTransformRef.current = {
      kind: "scale",
      pointerId: event.pointerId,
      endpoint,
      startDistance: Math.max(
        1,
        Math.hypot(
          event.clientX - (bounds.left + bounds.width / 2),
          event.clientY - (bounds.top + bounds.height / 2)
        )
      ),
      scale: activeValues(endpoint).scale,
    };
  };

  const startPreviewRotation = (event: PointerEvent<HTMLButtonElement>) => {
    if (!source || disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = previewTransformBounds();
    if (!bounds) return;
    const endpoint = activeEndpoint;
    event.currentTarget.setPointerCapture(event.pointerId);
    stopPreview(endpoint);
    previewTransformRef.current = {
      kind: "rotate",
      pointerId: event.pointerId,
      endpoint,
      angle:
        (Math.atan2(
          event.clientY - (bounds.top + bounds.height / 2),
          event.clientX - (bounds.left + bounds.width / 2)
        ) *
          180) /
        Math.PI,
      rotation: activeValues(endpoint).rotation,
    };
  };

  const movePreview = (event: PointerEvent<HTMLElement>) => {
    const transform = previewTransformRef.current;
    if (!transform || transform.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (transform.kind === "move") {
      updateEndpoint(
        transform.endpoint,
        moveCrop(
          baseCrop,
          transform.crop,
          transform.scale,
          event.clientX - transform.startX,
          event.clientY - transform.startY,
          transform.width,
          transform.height
        )
      );
      return;
    }
    const bounds = previewTransformBounds();
    if (!bounds) return;
    if (transform.kind === "scale") {
      const distance = Math.max(
        1,
        Math.hypot(
          event.clientX - (bounds.left + bounds.width / 2),
          event.clientY - (bounds.top + bounds.height / 2)
        )
      );
      updateScale(transform.endpoint, (transform.scale * distance) / transform.startDistance);
      return;
    }
    const angle =
      (Math.atan2(
        event.clientY - (bounds.top + bounds.height / 2),
        event.clientX - (bounds.left + bounds.width / 2)
      ) *
        180) /
      Math.PI;
    const delta = ((angle - transform.angle + 540) % 360) - 180;
    transform.angle = angle;
    transform.rotation = clampRotation(transform.rotation + delta);
    updateRotation(transform.endpoint, transform.rotation);
  };

  const finishPreviewDrag = (event: PointerEvent<HTMLElement>) => {
    if (previewTransformRef.current?.pointerId !== event.pointerId) return;
    previewTransformRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderEndpoint = (
    endpoint: Endpoint,
    label: string,
    crop: Region,
    scale: number,
    rotation: number
  ) => {
    const zoom = cropZoom(baseCrop, crop);
    const effectiveScale = scale * zoom;
    const position = cropPosition(baseCrop, crop, scale);
    const setPosition = (axis: "x" | "y", value: number) =>
      updateEndpoint(
        endpoint,
        positionedCrop(
          baseCrop,
          crop,
          scale,
          axis === "x" ? value : position.x,
          axis === "y" ? value : position.y
        )
      );
    return (
      <section
        className={`border-border bg-muted/30 space-y-4 rounded-xl border p-4 transition-shadow ${endpoint === activeEndpoint ? "ring-primary/35 ring-2" : ""}`}
        aria-labelledby={`scene-${sceneNumber}-${endpoint}-frame`}
      >
        <div className="flex items-center justify-between gap-3">
          <h3
            id={`scene-${sceneNumber}-${endpoint}-frame`}
            className="text-foreground flex items-center gap-2 text-sm font-semibold"
          >
            {label}
            {endpoint === activeEndpoint && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Editing
              </span>
            )}
          </h3>
          <span className="bg-background text-muted-foreground rounded-md border px-2 py-1 text-[11px] font-medium tabular-nums">
            {endpoint === "start" ? "00:00" : `${scene.durationSeconds.toFixed(2)}s`}
          </span>
        </div>
        <label className="text-muted-foreground grid grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-2 text-xs">
          <span>Scale</span>
          <input
            type="range"
            min={SCALE_MIN}
            max={SCALE_MAX * zoom}
            step={0.01}
            value={effectiveScale}
            disabled={disabled}
            aria-label={`Scene ${sceneNumber} ${label.toLowerCase()} scale`}
            onChange={(event) => updateScale(endpoint, Number(event.currentTarget.value) / zoom)}
            className="accent-primary h-8 min-w-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <ScalePercentageInput
            percentage={effectiveScale * 100}
            disabled={disabled}
            ariaLabel={`Scene ${sceneNumber} ${label.toLowerCase()} scale percentage`}
            onChange={(percentage) => updateScale(endpoint, percentage / 100 / zoom)}
          />
        </label>
        <div className="text-muted-foreground grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 text-xs">
          <span>Rotation</span>
          <div className="flex items-center gap-2">
            <div className="relative w-28">
              <input
                type="number"
                min={-ROTATION_LIMIT}
                max={ROTATION_LIMIT}
                step={0.5}
                value={rotation}
                disabled={disabled}
                aria-label={`Scene ${sceneNumber} ${label.toLowerCase()} rotation in degrees`}
                onChange={(event) => updateRotation(endpoint, Number(event.currentTarget.value))}
                className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/20 h-9 w-full appearance-none rounded-md border py-1 pr-7 pl-2 text-sm tabular-nums outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                °
              </span>
            </div>
            <NumberStepperControls
              value={rotation}
              min={-ROTATION_LIMIT}
              max={ROTATION_LIMIT}
              step={1}
              disabled={disabled}
              ariaLabel={`Scene ${sceneNumber} ${label.toLowerCase()} rotation in degrees`}
              onChange={(value) => updateRotation(endpoint, value)}
            />
            <RotationDial
              value={rotation}
              min={-ROTATION_LIMIT}
              max={ROTATION_LIMIT}
              step={0.5}
              disabled={disabled}
              ariaLabel={`Scene ${sceneNumber} ${label.toLowerCase()} rotation dial`}
              onChange={(value) => updateRotation(endpoint, value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-muted-foreground space-y-1.5 text-[11px] font-medium">
            <span className="block">X position</span>
            <NumberInputWithSteppers
              value={position.x}
              min={-100}
              max={200}
              disabled={disabled}
              ariaLabel={`Scene ${sceneNumber} ${label.toLowerCase()} X position`}
              onChange={(value) => setPosition("x", value)}
            />
          </div>
          <div className="text-muted-foreground space-y-1.5 text-[11px] font-medium">
            <span className="block">Y position</span>
            <NumberInputWithSteppers
              value={position.y}
              min={-100}
              max={200}
              disabled={disabled}
              ariaLabel={`Scene ${sceneNumber} ${label.toLowerCase()} Y position`}
              onChange={(value) => setPosition("y", value)}
            />
          </div>
        </div>
        <label className="text-muted-foreground space-y-1.5 text-[11px] font-medium">
          <span>Position anchor</span>
          <Select
            disabled={disabled}
            value={cropAnchor(baseCrop, crop, scale)}
            onValueChange={(value) => {
              const point = anchorPosition(value as Anchor);
              updateEndpoint(endpoint, positionedCrop(baseCrop, crop, scale, point.x, point.y));
            }}
          >
            <SelectTrigger
              aria-label={`Scene ${sceneNumber} ${label.toLowerCase()} anchor`}
              className="border-input bg-background text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["center", "left", "right", "top", "bottom"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </section>
    );
  };

  const apply = () => {
    if (!customCropIsSafe) return;
    onApply({
      standardMotionPreset: motion,
      standardBaseCrop: motion === "custom" ? baseCrop : null,
      standardStartCrop: motion === "custom" ? startCrop : null,
      standardEndCrop: motion === "custom" ? endCrop : null,
      standardStartScale: motion === "custom" ? startScale : null,
      standardEndScale: motion === "custom" ? endScale : null,
      standardStartRotation: motion === "custom" ? startRotation : null,
      standardEndRotation: motion === "custom" ? endRotation : null,
    });
    savedMotionSettingsRef.current = null;
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={openEditor}
        className="h-auto min-h-11 w-fit max-w-full justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="text-primary size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Advanced · first and last frame</span>
        </span>
        <span className="text-muted-foreground shrink-0 text-[11px] font-normal">Open editor</span>
      </Button>
      {!source && (
        <p className="text-muted-foreground text-[11px]">
          You can set up the motion now. Choose an approved start frame to preview it on the
          product.
        </p>
      )}

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? openEditor() : cancelEditor())}>
        <DialogContent
          showCloseButton={false}
          className="border-border bg-card text-card-foreground h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] xl:h-[min(90dvh,60rem)] xl:w-[min(94vw,88rem)] xl:max-w-[88rem]"
        >
          <DialogHeader className="border-border bg-card flex-row items-center justify-between gap-4 border-b px-5 py-4 text-left sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"
                aria-hidden="true"
              >
                <Clapperboard className="size-4" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-foreground truncate text-lg">
                  Scene {sceneNumber} · Standard motion editor
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  Preview and edit the camera path before rendering.
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={cancelEditor}
              className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              aria-label="Close motion editor"
              title="Close"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
            <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)] lg:overflow-hidden">
              <section
                ref={previewCanvasRef}
                className="bg-muted/55 relative flex min-h-[26rem] items-center justify-center p-4 pb-14 sm:p-6 sm:pb-16 lg:min-h-0 xl:p-8 xl:pb-18"
                aria-label="Motion preview canvas"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                    backgroundSize: "36px 36px",
                  }}
                />
                <div
                  ref={previewFrameRef}
                  onPointerDown={startPreviewDrag}
                  onPointerMove={movePreview}
                  onPointerUp={finishPreviewDrag}
                  onPointerCancel={finishPreviewDrag}
                  className={`relative max-h-full max-w-full rounded-xl bg-black shadow-lg ring-1 ring-white/25 ${source && !disabled ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
                  style={{
                    aspectRatio: previewAspect,
                    height: ratioWidth > ratioHeight ? "auto" : "min(72vh, 100%)",
                    width: ratioWidth > ratioHeight ? "min(100%, 76rem)" : "auto",
                    transform: `scale(${canvasZoom})`,
                  }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    {source ? (
                      motion === "contain_gentle" ? (
                        <Image
                          ref={previewImageRef}
                          src={source.previewUrl}
                          alt={`Motion preview for scene ${sceneNumber}`}
                          fill
                          unoptimized
                          sizes="70vw"
                          className="object-contain"
                          draggable={false}
                          style={{
                            backfaceVisibility: "hidden",
                            transform: `translate3d(0, 0, 0) scale(${(0.97 + 0.03 * playhead) * previewScale}) rotate(${previewRotation}deg)`,
                            transformOrigin: "center",
                            willChange: "transform",
                          }}
                        />
                      ) : (
                        <Image
                          ref={previewImageRef}
                          src={source.previewUrl}
                          alt={`Motion preview for scene ${sceneNumber}`}
                          width={source.width}
                          height={source.height}
                          unoptimized
                          draggable={false}
                          className="absolute max-w-none"
                          style={{
                            backfaceVisibility: "hidden",
                            width: `${100 / previewCrop.width}%`,
                            height: `${100 / previewCrop.height}%`,
                            left: `${(-previewCrop.x / previewCrop.width) * 100}%`,
                            top: `${(-previewCrop.y / previewCrop.height) * 100}%`,
                            transform: `translate3d(0, 0, 0) scale(${previewScale}) rotate(${previewRotation}deg)`,
                            transformOrigin: "center",
                            willChange: "transform",
                          }}
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
                        <span className="bg-muted text-primary flex size-12 items-center justify-center rounded-full">
                          <SlidersHorizontal className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-white">
                            Motion setup is ready
                          </p>
                          <p className="mt-1.5 max-w-sm text-sm leading-6 text-white/70">
                            Choose an approved start frame in the scene to preview this camera path
                            on the product.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 border border-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/35" />
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-white/35" />
                    <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/75 px-2.5 py-1 text-xs font-semibold text-white tabular-nums shadow-sm">
                      {Math.round(playhead * scene.durationSeconds * 10) / 10}s
                    </span>
                  </div>
                  {source && imageBounds && !disabled && (
                    <div
                      className="border-primary pointer-events-none absolute z-20 border-2 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                      style={{
                        ...imageBounds,
                        transformOrigin: "center",
                        transform: imageBounds.transform,
                      }}
                    >
                      {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(
                        (corner) => (
                          <button
                            key={corner}
                            type="button"
                            aria-label={`Resize ${activeEndpoint === "start" ? "first" : "last"} frame from ${corner.replace("-", " ")}`}
                            title="Drag to resize"
                            onPointerDown={startPreviewScale}
                            onPointerMove={movePreview}
                            onPointerUp={finishPreviewDrag}
                            onPointerCancel={finishPreviewDrag}
                            className={`pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${corner.includes("right") ? "left-full" : "left-0"} ${corner.includes("bottom") ? "top-full" : "top-0"}`}
                          >
                            <span className="bg-primary size-3 rounded-full border-2 border-white shadow-sm" />
                          </button>
                        )
                      )}
                      <span className="bg-primary text-primary-foreground pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm">
                        Editing {activeEndpoint === "start" ? "first" : "last"} frame
                      </span>
                      <span className="border-primary pointer-events-none absolute top-full left-1/2 h-4 -translate-x-1/2 border-l-2" />
                      <button
                        type="button"
                        aria-label={`Rotate ${activeEndpoint === "start" ? "first" : "last"} frame`}
                        title="Drag to rotate"
                        onPointerDown={startPreviewRotation}
                        onPointerMove={movePreview}
                        onPointerUp={finishPreviewDrag}
                        onPointerCancel={finishPreviewDrag}
                        className="border-primary bg-card text-primary pointer-events-auto absolute top-[calc(100%+1rem)] left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 shadow-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:cursor-grabbing"
                      >
                        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
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
                  )}
                </div>
                <div
                  className="border-border bg-background/95 absolute right-4 bottom-4 z-10 flex items-center overflow-hidden rounded-lg border shadow-md backdrop-blur-sm"
                  role="group"
                  aria-label="Preview zoom controls"
                >
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={canvasZoom <= CANVAS_ZOOM_MIN}
                    onClick={() => adjustCanvasZoom(-CANVAS_ZOOM_STEP)}
                    className="text-foreground hover:bg-muted hover:translate-y-0"
                    aria-label="Zoom out preview"
                    title="Zoom out"
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </Button>
                  <span className="border-border text-foreground min-w-12 border-x px-2 text-center text-xs font-semibold tabular-nums">
                    {Math.round(canvasZoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={canvasZoom >= CANVAS_ZOOM_MAX}
                    onClick={() => adjustCanvasZoom(CANVAS_ZOOM_STEP)}
                    className="text-foreground hover:bg-muted hover:translate-y-0"
                    aria-label="Zoom in preview"
                    title="Zoom in"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </section>

              <aside
                className="border-border bg-card min-h-0 space-y-5 border-t p-5 lg:overflow-y-auto lg:border-t-0 lg:border-l xl:p-6"
                aria-label="Transform controls"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-foreground text-base font-semibold">Transform</h2>
                </div>
                <label className="text-muted-foreground block space-y-2 text-sm font-medium">
                  <span>Camera movement</span>
                  <Select value={motion} disabled={disabled} onValueChange={choosePreset}>
                    <SelectTrigger
                      aria-label={`Scene ${sceneNumber} editor camera movement`}
                      className="border-input bg-background text-foreground h-11"
                    >
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
                {renderEndpoint("start", "First frame", startCrop, startScale, startRotation)}
                {renderEndpoint("end", "Last frame", endCrop, endScale, endRotation)}
                {!customCropIsSafe && (
                  <p
                    role="alert"
                    className="border-secondary/25 bg-secondary/10 text-secondary rounded-lg border p-4 text-sm leading-6"
                  >
                    Move or zoom out until the product and artwork remain visible in both keyframes.
                  </p>
                )}
              </aside>
            </div>

            <section
              className="border-border bg-muted/20 border-t px-5 py-2.5 sm:px-6"
              aria-label="Scene timeline"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={playing ? "Pause motion preview" : "Play motion preview"}
                    onClick={() => {
                      if (playhead >= 1) setPlayhead(0);
                      setPlaying((value) => !value);
                    }}
                    className="text-primary hover:bg-primary/10 size-9"
                  >
                    {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  </Button>
                  <span className="text-muted-foreground text-sm font-medium tabular-nums">
                    {(playhead * scene.durationSeconds).toFixed(2)} /{" "}
                    {scene.durationSeconds.toFixed(2)}s
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMotion("custom");
                    setStartCrop(baseCrop);
                    setEndCrop(baseCrop);
                    setStartScale(1);
                    setEndScale(1);
                    setStartRotation(0);
                    setEndRotation(0);
                    setPlayhead(0);
                    setPlaying(false);
                  }}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground min-h-9"
                >
                  <RotateCcw aria-hidden="true" />
                  Start from default
                </Button>
              </div>
              <div className="border-border bg-background relative h-14 overflow-hidden rounded-lg border shadow-sm">
                <div
                  className="absolute inset-y-2 right-2 left-2 grid grid-cols-8 overflow-hidden rounded-md opacity-55"
                  aria-hidden="true"
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={index}
                      className="border-border bg-muted/60 relative border-r last:border-r-0"
                    >
                      {source && (
                        <Image
                          src={source.previewUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="140px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={playhead}
                  aria-label={`Scene ${sceneNumber} timeline playhead`}
                  onChange={(event) => {
                    setPlaying(false);
                    setPlayhead(Number(event.currentTarget.value));
                  }}
                  className="absolute inset-0 z-20 size-full cursor-ew-resize opacity-0"
                />
                <span
                  className="bg-primary pointer-events-none absolute top-0 bottom-0 z-10 w-px"
                  style={{ left: `${playhead * 100}%` }}
                >
                  <span className="bg-primary absolute -top-px -left-1 size-2 rotate-45" />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setPlayhead(0);
                  }}
                  className="bg-background/95 text-primary focus-visible:ring-ring absolute top-1/2 left-3 z-30 -translate-y-1/2 rounded-md p-1.5 shadow-sm focus-visible:ring-2"
                  aria-label="Go to first frame"
                >
                  <Diamond className="size-3 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setPlayhead(1);
                  }}
                  className="bg-background/95 text-primary focus-visible:ring-ring absolute top-1/2 right-3 z-30 -translate-y-1/2 rounded-md p-1.5 shadow-sm focus-visible:ring-2"
                  aria-label="Go to last frame"
                >
                  <Diamond className="size-3 fill-current" />
                </button>
              </div>
            </section>
          </div>

          <DialogFooter className="border-border bg-card border-t px-5 py-4 sm:items-center sm:justify-between sm:px-6">
            <p className="text-muted-foreground mr-auto flex items-center gap-2 text-sm">
              {hasRenderedVideo ? (
                <>
                  <Sparkles className="text-primary size-4" aria-hidden="true" />
                  Save changes, then rerender to update the generated video.
                </>
              ) : (
                "These settings will be used when this scene is rendered."
              )}
            </p>
            <Button type="button" variant="ghost" onClick={cancelEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled || !customCropIsSafe || (!source && motion === "custom")}
              onClick={apply}
            >
              Apply motion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
