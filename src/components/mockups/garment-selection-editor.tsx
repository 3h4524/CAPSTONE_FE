"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Brush, Eraser, RotateCcw, ScanSearch, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  alphaOf,
  autoSelectGarment,
  createSelectionPhoto,
  DEFAULT_TOLERANCE,
  editorSize,
  growRegion,
  MAX_TOLERANCE,
  MIN_TOLERANCE,
  paintStroke,
  selectionCoverage,
  selectionFromAlpha,
  type SelectionMask,
  type SelectionPhoto,
  selectionToRgba,
  unionMasks,
} from "@/helpers/garment-selection";
import { cn } from "@/utils/cn";

export type GarmentSelection = {
  mask: SelectionMask;
  /** The size the selection was made at; the photo scaled down. */
  width: number;
  height: number;
  /** The share of the photo selected, 0..1. */
  coverage: number;
};

type Tool = "wand" | "add" | "erase";

type GarmentSelectionEditorProps = {
  photoUrl: string;
  /** The person the server found on the photo (opacity = person); keeps the selection off the background. */
  personMaskUrl: string | null;
  /** A selection saved before, to start from. */
  initialSelectionUrl?: string | null;
  /** The garment the server's clothes model found on a new photo (opacity = garment); started from and reported. */
  suggestedSelectionUrl?: string | null;
  disabled?: boolean;
  /** Shows the selection without the tools to change it. */
  readOnly?: boolean;
  onChange: (selection: GarmentSelection | null) => void;
};

const MAX_UNDO = 20;
const OVERLAY_RGBA: [number, number, number, number] = [14, 165, 233, 115];

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous"; // the pixels are read back
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });

const pixelsOf = (image: HTMLImageElement, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No canvas.");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
};

/** The selection as the PNG the server reads: opaque where selected. */
export const selectionToPng = (selection: GarmentSelection) =>
  new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = selection.width;
    canvas.height = selection.height;
    const context = canvas.getContext("2d");
    if (!context) return reject(new Error("No canvas."));
    context.putImageData(
      new ImageData(selectionToRgba(selection.mask), selection.width, selection.height),
      0,
      0
    );
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the selection."))),
      "image/png"
    );
  });

/** The selection as an image URL, for showing the garment elsewhere (the print area editor's garment box). */
export const selectionToDataUrl = (selection: GarmentSelection) => {
  const canvas = document.createElement("canvas");
  canvas.width = selection.width;
  canvas.height = selection.height;
  canvas
    .getContext("2d")
    ?.putImageData(
      new ImageData(selectionToRgba(selection.mask), selection.width, selection.height),
      0,
      0
    );
  return canvas.toDataURL("image/png");
};

/**
 * Selects the garment on a photo of a person: a click selects the area of the clicked color (on the person
 * only), and a brush adds or erases by hand.
 */
export const GarmentSelectionEditor = ({
  photoUrl,
  personMaskUrl,
  initialSelectionUrl,
  suggestedSelectionUrl,
  disabled = false,
  readOnly = false,
  onChange,
}: GarmentSelectionEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The stroke being painted keeps its own mask: several pointer moves can arrive before React renders.
  const strokeRef = useRef<{ last: { x: number; y: number }; mask: SelectionMask } | null>(null);
  const [photo, setPhoto] = useState<SelectionPhoto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mask, setMask] = useState<SelectionMask | null>(null);
  const [history, setHistory] = useState<SelectionMask[]>([]);
  const [tool, setTool] = useState<Tool>("wand");
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [brush, setBrush] = useState(2);
  // Whether the selection shown is the one made automatically, not changed since.
  const [autoSelected, setAutoSelected] = useState(false);
  // The garment the clothes model found, kept so a saved or edited selection can go back to it.
  const [suggestion, setSuggestion] = useState<SelectionMask | null>(null);
  // The latest onChange, for reporting the automatic selection from the loading effect without re-running it.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Reads the photo (and the person and any saved selection) at the editor's size.
  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    setMask(null);
    setHistory([]);
    setLoadError(false);
    setAutoSelected(false);
    void (async () => {
      try {
        const image = await loadImage(photoUrl);
        const size = editorSize({ width: image.naturalWidth, height: image.naturalHeight });
        const rgba = pixelsOf(image, size.width, size.height);
        const person = personMaskUrl
          ? alphaOf(pixelsOf(await loadImage(personMaskUrl), size.width, size.height))
          : null;
        const readSelection = (url: string | null | undefined) =>
          url
            ? loadImage(url)
                .then((selection) =>
                  selectionFromAlpha(alphaOf(pixelsOf(selection, size.width, size.height)))
                )
                .catch(() => null)
            : Promise.resolve(null);
        const saved = await readSelection(initialSelectionUrl);
        const read = await readSelection(suggestedSelectionUrl);
        const suggested = read && selectionCoverage(read) > 0 ? read : null;
        if (cancelled) return;
        setSuggestion(suggested);
        const loaded = createSelectionPhoto(size.width, size.height, rgba, person);
        // A new photo starts with the garment selected for the seller: the one the clothes model found, else a
        // light garment found by its color.
        const found = saved ? null : (suggested ?? autoSelectGarment(loaded));
        setPhoto(loaded);
        setMask(saved ?? found ?? new Uint8Array(size.width * size.height));
        if (found) {
          setAutoSelected(true);
          onChangeRef.current({
            mask: found,
            width: loaded.width,
            height: loaded.height,
            coverage: selectionCoverage(found),
          });
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUrl, personMaskUrl, initialSelectionUrl, suggestedSelectionUrl]);

  // The selection, tinted over the photo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo || !mask) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    const overlay = new Uint8ClampedArray(new ArrayBuffer(mask.length * 4));
    for (let i = 0; i < mask.length; i++) if (mask[i]) overlay.set(OVERLAY_RGBA, i * 4);
    canvas.getContext("2d")?.putImageData(new ImageData(overlay, photo.width, photo.height), 0, 0);
  }, [photo, mask]);

  const commit = (next: SelectionMask, before: SelectionMask) => {
    if (!photo) return;
    setHistory((past) => [...past.slice(-(MAX_UNDO - 1)), before]);
    setMask(next);
    setAutoSelected(false);
    const coverage = selectionCoverage(next);
    onChange(
      coverage > 0 ? { mask: next, width: photo.width, height: photo.height, coverage } : null
    );
  };

  const pointAt = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * (photo?.width ?? 0),
      y: ((event.clientY - rect.top) / rect.height) * (photo?.height ?? 0),
    };
  };

  // The brush is sized as a share of the photo, so it feels the same on any photo.
  const brushRadius = photo ? (Math.max(photo.width, photo.height) * brush) / 100 : 1;

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!photo || !mask || disabled || readOnly) return;
    const point = pointAt(event);
    if (tool === "wand") {
      commit(unionMasks(mask, growRegion(photo, point.x, point.y, tolerance)), mask);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const painted = paintStroke(mask, photo, point, point, brushRadius, tool === "add" ? 1 : 0);
    strokeRef.current = { last: point, mask: painted };
    setHistory((past) => [...past.slice(-(MAX_UNDO - 1)), mask]);
    setMask(painted);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = strokeRef.current;
    if (!stroke || !photo) return;
    const point = pointAt(event);
    stroke.mask = paintStroke(
      stroke.mask,
      photo,
      stroke.last,
      point,
      brushRadius,
      tool === "add" ? 1 : 0
    );
    stroke.last = point;
    setMask(stroke.mask);
  };

  const endStroke = () => {
    const stroke = strokeRef.current;
    if (!stroke || !photo) return;
    strokeRef.current = null;
    setAutoSelected(false);
    const coverage = selectionCoverage(stroke.mask);
    onChange(
      coverage > 0
        ? { mask: stroke.mask, width: photo.width, height: photo.height, coverage }
        : null
    );
  };

  const undo = () => {
    if (!photo || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((past) => past.slice(0, -1));
    setMask(previous);
    const coverage = selectionCoverage(previous);
    onChange(
      coverage > 0 ? { mask: previous, width: photo.width, height: photo.height, coverage } : null
    );
  };

  const clear = () => {
    if (!photo || !mask) return;
    commit(new Uint8Array(mask.length), mask);
  };

  const applySuggestion = () => {
    if (!photo || !mask || !suggestion) return;
    commit(suggestion, mask);
    setAutoSelected(true);
  };

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        The photo could not be read for selecting the garment. Choose the photo again.
      </p>
    );
  }

  const coverage = mask ? selectionCoverage(mask) : 0;
  const tools: { value: Tool; label: string; icon: typeof Wand2 }[] = [
    { value: "wand", label: "Select color", icon: Wand2 },
    { value: "add", label: "Brush", icon: Brush },
    { value: "erase", label: "Erase", icon: Eraser },
  ];

  return (
    <div className="space-y-2">
      {!readOnly && (
        <>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="toolbar"
            aria-label="Garment selection tools"
          >
            {tools.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={tool === value ? "default" : "outline"}
                className="h-8 px-2.5 text-xs"
                aria-pressed={tool === value}
                disabled={disabled || !photo}
                onClick={() => setTool(value)}
              >
                <Icon aria-hidden="true" />
                {label}
              </Button>
            ))}
            <span className="mx-1 h-5 w-px bg-ink-200" aria-hidden="true" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs"
              disabled={disabled || history.length === 0}
              onClick={undo}
            >
              <RotateCcw aria-hidden="true" />
              Undo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs"
              disabled={disabled || coverage === 0}
              onClick={clear}
            >
              <Trash2 aria-hidden="true" />
              Clear
            </Button>
            {suggestion && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-xs"
                disabled={disabled || !photo}
                onClick={applySuggestion}
              >
                <ScanSearch aria-hidden="true" />
                Find garment
              </Button>
            )}
          </div>
          <label className="flex items-center gap-3 text-xs text-ink-700">
            <span className="w-28 shrink-0">
              {tool === "wand" ? "Color tolerance" : "Brush size"}
            </span>
            {tool === "wand" ? (
              <input
                type="range"
                min={MIN_TOLERANCE}
                max={MAX_TOLERANCE}
                value={tolerance}
                disabled={disabled || !photo}
                onChange={(event) => setTolerance(Number(event.target.value))}
                className="accent-primary w-full"
              />
            ) : (
              <input
                type="range"
                min={0.5}
                max={6}
                step={0.5}
                value={brush}
                disabled={disabled || !photo}
                onChange={(event) => setBrush(Number(event.target.value))}
                className="accent-primary w-full"
              />
            )}
          </label>
        </>
      )}
      <div className="relative w-fit max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Model photo"
          crossOrigin="anonymous"
          draggable={false}
          className="block max-h-105 max-w-full rounded-lg ring-1 ring-ink-200 select-none ring-inset"
        />
        <canvas
          ref={canvasRef}
          aria-label="Garment selection"
          className={cn(
            "absolute inset-0 size-full touch-none rounded-lg",
            disabled || readOnly || !photo
              ? "pointer-events-none"
              : tool === "wand"
                ? "cursor-crosshair"
                : "cursor-cell"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
        {!photo && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/60"
            role="status"
            aria-label="Preparing the photo"
          >
            <Spinner className="size-6" />
          </div>
        )}
      </div>
      {!readOnly && (
        <p className="text-muted-foreground text-xs">
          {autoSelected
            ? "The garment was found automatically. Check that only it is blue (no skin, hair, or other clothes); fix it with the brush if needed."
            : coverage > 0
              ? `Selected: ${(coverage * 100).toFixed(1)}% of the photo. Only the garment should be blue: no skin, hair, or other clothes.`
              : "Click the garment to select it. Add what the click missed with the brush; erase anything that is not the garment."}
        </p>
      )}
    </div>
  );
};
