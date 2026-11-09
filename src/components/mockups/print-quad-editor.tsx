"use client";

import { type PointerEvent, useRef } from "react";

import { isValidQuad, type PrintQuad, type QuadPoint } from "@/helpers/mockup-template";

type PrintQuadEditorProps = {
  imageUrl: string;
  /** The photo's real size; the corners are in its pixels whatever size it is shown at. */
  pixelSize: { width: number; height: number };
  value: PrintQuad;
  onChange: (quad: PrintQuad) => void;
  disabled?: boolean;
  /** The selected garment, shown faintly so the corners can follow the chest. */
  garmentMaskUrl?: string;
};

type Drag = { corner: number } | { corner: "all"; from: QuadPoint; start: PrintQuad };

const CORNER_LABELS = ["top-left", "top-right", "bottom-right", "bottom-left"];

/**
 * Marks a print area by its four corners on a photo of a person: drag a corner to follow a chest that is turned a
 * little from the camera, or drag inside to move the whole area. The design is warped onto the corners.
 */
export const PrintQuadEditor = ({
  imageUrl,
  pixelSize,
  value,
  onChange,
  disabled = false,
  garmentMaskUrl,
}: PrintQuadEditorProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const { width, height } = pixelSize;
  const handle = Math.max(width, height) * 0.012;
  const valid = isValidQuad(value, width, height);

  const pointAt = (event: PointerEvent): QuadPoint => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.min(width, Math.max(0, ((event.clientX - rect.left) / rect.width) * width)),
      y: Math.min(height, Math.max(0, ((event.clientY - rect.top) / rect.height) * height)),
    };
  };

  const startDrag = (event: PointerEvent<SVGElement>, corner: number | "all") => {
    if (disabled) return;
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    dragRef.current =
      corner === "all" ? { corner, from: pointAt(event), start: value } : { corner };
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointAt(event);
    if (drag.corner === "all") {
      // The whole area moves as far as it can while every corner stays on the photo.
      const xs = drag.start.map((corner) => corner.x);
      const ys = drag.start.map((corner) => corner.y);
      const dx = Math.min(
        width - Math.max(...xs),
        Math.max(-Math.min(...xs), point.x - drag.from.x)
      );
      const dy = Math.min(
        height - Math.max(...ys),
        Math.max(-Math.min(...ys), point.y - drag.from.y)
      );
      onChange(
        drag.start.map((corner) => ({
          x: Math.round(corner.x + dx),
          y: Math.round(corner.y + dy),
        })) as PrintQuad
      );
      return;
    }
    const next = [...value] as PrintQuad;
    next[drag.corner] = { x: Math.round(point.x), y: Math.round(point.y) };
    onChange(next);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const polygon = value.map((corner) => `${corner.x},${corner.y}`).join(" ");

  return (
    <div className="space-y-2">
      <div className="relative w-fit max-w-full">
        {/* Plain <img>: the overlay is measured against the element as it is laid out. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Model photo"
          draggable={false}
          className="ring-ink-200 block max-h-105 max-w-full rounded-lg ring-1 select-none ring-inset"
        />
        {garmentMaskUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg bg-sky-400/25"
            style={{
              maskImage: `url(${garmentMaskUrl})`,
              WebkitMaskImage: `url(${garmentMaskUrl})`,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
            }}
          />
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full touch-none"
          onPointerMove={move}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Print area corners"
        >
          <polygon
            points={polygon}
            className={valid ? "fill-primary/15 stroke-primary" : "fill-red-500/15 stroke-red-600"}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: disabled ? "default" : "move" }}
            onPointerDown={(event) => startDrag(event, "all")}
          />
          {value.map((corner, index) => (
            <circle
              key={CORNER_LABELS[index]}
              cx={corner.x}
              cy={corner.y}
              r={handle}
              className="stroke-primary fill-white"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: disabled ? "default" : "grab" }}
              aria-label={`${CORNER_LABELS[index]} corner`}
              onPointerDown={(event) => startDrag(event, index)}
            />
          ))}
        </svg>
      </div>
      <p
        className={valid ? "text-muted-foreground text-xs" : "text-xs text-red-600 dark:text-red-400"}
        role={valid ? undefined : "alert"}
      >
        {valid
          ? "Drag a corner to follow the chest, or drag inside to move the area. The design is warped onto it."
          : "The corners cross or go round the wrong way. Keep them in order: top-left, top-right, bottom-right, bottom-left."}
      </p>
    </div>
  );
};
