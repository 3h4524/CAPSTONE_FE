"use client";

import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MockupPrintArea } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type Handle = "nw" | "ne" | "sw" | "se";
type Bounds = { x: number; y: number; width: number; height: number };
type DragState =
  | { mode: "new"; anchorX: number; anchorY: number }
  | { mode: "move"; startX: number; startY: number; origin: Bounds }
  | { mode: "resize"; handle: Handle; origin: Bounds };

type PrintAreaEditorProps = {
  imageUrl: string;
  value: MockupPrintArea;
  onChange: (area: MockupPrintArea) => void;
  disabled?: boolean;
  /** The design image, previewed live inside the box for visual centering. */
  overlayImageUrl?: string;
  /** Previews a garment recolor: the color multiplied onto the photo through the garment mask. */
  garmentTint?: { color: string; maskUrl: string };
  /** The photo's real size, when the image shown is a smaller preview of it; coordinates stay in real pixels. */
  pixelSize?: { width: number; height: number };
  /** The garment mask the server made for this photo; when given, the garment box comes from it. */
  garmentMaskUrl?: string;
};

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

// Snap distance in on-screen pixels, independent of image zoom.
const SNAP_SCREEN_PX = 10;

const snapToCenter = (rect: Bounds, target: { centerX: number; centerY: number }, scale: number) => {
  const threshold = SNAP_SCREEN_PX / (scale || 1);
  const snapH = Math.abs(rect.x + rect.width / 2 - target.centerX) < threshold;
  const snapV = Math.abs(rect.y + rect.height / 2 - target.centerY) < threshold;
  return {
    // Rounded: the backend binds these as ints.
    rect: {
      ...rect,
      x: snapH ? Math.round(target.centerX - rect.width / 2) : rect.x,
      y: snapV ? Math.round(target.centerY - rect.height / 2) : rect.y,
    },
    snap: { h: snapH, v: snapV },
  };
};

// Best-effort garment bounding box against a plain backdrop: samples a border band as the
// background color, then bounds rows/columns with enough differing pixels. The user can correct it.
const detectGarmentBounds = (img: HTMLImageElement): Bounds | null => {
  try {
    const MAX_DIM = 320;
    const downscale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight)) || 1;
    const w = Math.max(1, Math.round(img.naturalWidth * downscale));
    const h = Math.max(1, Math.round(img.naturalHeight * downscale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const band = Math.max(2, Math.round(Math.min(w, h) * 0.03));
    let sr = 0, sg = 0, sb = 0, sc = 0;
    const sample = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sc++;
    };
    for (let x = 0; x < w; x += 2) for (const y of [0, band, h - 1 - band, h - 1]) sample(x, y);
    for (let y = 0; y < h; y += 2) for (const x of [0, band, w - 1 - band, w - 1]) sample(x, y);
    const bg = [sr / sc, sg / sc, sb / sc];

    const THRESHOLD = 26;
    const rowCounts = new Int32Array(h);
    const colCounts = new Int32Array(w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
        if (Math.sqrt(dr * dr + dg * dg + db * db) > THRESHOLD) {
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
    }

    // Minimum differing-pixel count for a row/column to count as garment, not edge noise.
    const minRow = Math.max(2, Math.round(w * 0.01));
    const minCol = Math.max(2, Math.round(h * 0.01));
    let minY = -1, maxY = -1;
    for (let y = 0; y < h; y++) if (rowCounts[y] >= minRow) { if (minY < 0) minY = y; maxY = y; }
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) if (colCounts[x] >= minCol) { if (minX < 0) minX = x; maxX = x; }

    if (minX < 0 || minY < 0) return null;
    if (((maxX - minX) * (maxY - minY)) / (w * h) < 0.02) return null; // too small to be real

    const inv = 1 / downscale;
    return {
      x: Math.round(minX * inv), y: Math.round(minY * inv),
      width: Math.round((maxX - minX) * inv), height: Math.round((maxY - minY) * inv),
    };
  } catch {
    return null;
  }
};

const Handles = ({ className }: { className: string }) => (
  <>
    {(["nw", "ne", "sw", "se"] as const).map((handle) => (
      <div
        key={handle}
        data-handle={handle}
        className={cn(
          "absolute size-3 rounded-sm border-2 bg-white",
          className,
          handle === "nw" && "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
          handle === "ne" && "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
          handle === "sw" && "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
          handle === "se" && "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"
        )}
      />
    ))}
  </>
);

type Size = { width: number; height: number };
type GarmentMask = Size & { alpha: Uint8ClampedArray };

// A mask image's opacity, read small: enough to box the garment and to tell what lies off it.
const loadGarmentMask = (maskUrl: string) =>
  new Promise<GarmentMask | null>((resolve) => {
    const mask = new window.Image();
    mask.crossOrigin = "anonymous";
    mask.onerror = () => resolve(null);
    mask.onload = () => {
      try {
        const scale = Math.min(1, 256 / Math.max(mask.naturalWidth, mask.naturalHeight)) || 1;
        const w = Math.max(1, Math.round(mask.naturalWidth * scale));
        const h = Math.max(1, Math.round(mask.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(mask, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h).data;
        const alpha = new Uint8ClampedArray(w * h);
        for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
        resolve({ width: w, height: h, alpha });
      } catch {
        resolve(null);
      }
    };
    mask.src = maskUrl;
  });

// The box around the opaque part of a mask, in a photo of the given size.
const boundsOfMask = (mask: GarmentMask, size: Size): Bounds | null => {
  let left = mask.width;
  let top = mask.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.alpha[y * mask.width + x] < 128) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return null;
  const kx = size.width / mask.width;
  const ky = size.height / mask.height;
  return {
    x: Math.round(left * kx),
    y: Math.round(top * ky),
    width: Math.round((right - left + 1) * kx),
    height: Math.round((bottom - top + 1) * ky),
  };
};

// How much of a box (in the photo's pixels) lies off the garment, 0..1.
const shareOffGarment = (mask: GarmentMask, box: Bounds, size: Size) => {
  const kx = mask.width / size.width;
  const ky = mask.height / size.height;
  const left = Math.floor(box.x * kx);
  const top = Math.floor(box.y * ky);
  const right = Math.max(left + 1, Math.ceil((box.x + box.width) * kx));
  const bottom = Math.max(top + 1, Math.ceil((box.y + box.height) * ky));
  let off = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (x < 0 || y < 0 || x >= mask.width || y >= mask.height || mask.alpha[y * mask.width + x] < 128) off++;
    }
  }
  return off / ((right - left) * (bottom - top));
};

// Where a design lands in a print area: fitted inside it and centered, as the composite places it.
const fitInside = (box: Bounds, design: Size): Bounds => {
  const scale = Math.min(box.width / design.width, box.height / design.height);
  const width = design.width * scale;
  const height = design.height * scale;
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
};

// Below this share, being off the garment is only the mask's soft edge.
const OFF_GARMENT_TOLERANCE = 0.02;
// The print-area box's border, which its contents sit inside of.
const BOX_BORDER_PX = 2;

// Drag-to-draw / move / resize print-area picker, in the photo's own pixels. A second mode lets the
// user correct the garment box that center-snapping is measured against.
export const PrintAreaEditor = ({ imageUrl, value, onChange, disabled = false, overlayImageUrl, garmentTint, pixelSize, garmentMaskUrl }: PrintAreaEditorProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [garmentBounds, setGarmentBounds] = useState<Bounds | null>(null);
  // Kept with the URL it was read from, so a mask of another photo is never applied to this one.
  const [loadedMask, setLoadedMask] = useState<{ url: string; mask: GarmentMask } | null>(null);
  const [overlaySize, setOverlaySize] = useState<Size | null>(null);
  const [editingGarment, setEditingGarment] = useState(false);
  const [snap, setSnap] = useState({ h: false, v: false });
  const [, forceRender] = useState(0);

  // Reset while rendering, not in an effect: an effect also runs right after mount, where it can
  // land after an already-cached photo's load event and wipe the size that event just measured.
  const [shownUrl, setShownUrl] = useState(imageUrl);
  if (shownUrl !== imageUrl) {
    setShownUrl(imageUrl);
    setNatural(null);
    setGarmentBounds(null);
    setEditingGarment(false);
  }

  // The server's mask knows the garment exactly; guessing it from the photo's colors fails once the
  // background is a backdrop nearly as light as the garment.
  useEffect(() => {
    if (!garmentMaskUrl || !natural) return;
    let cancelled = false;
    void loadGarmentMask(garmentMaskUrl).then((mask) => {
      if (cancelled || !mask) return;
      setLoadedMask({ url: garmentMaskUrl, mask });
      const bounds = boundsOfMask(mask, natural);
      if (bounds) setGarmentBounds(bounds);
    });
    return () => {
      cancelled = true;
    };
  }, [garmentMaskUrl, natural]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => forceRender((tick) => tick + 1));
    observer.observe(img);
    return () => observer.disconnect();
  }, []);

  const toNatural = useCallback((clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img || !natural) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scale = rect.width / natural.width || 1;
    return {
      x: clamp(Math.round((clientX - rect.left) / scale), 0, natural.width),
      y: clamp(Math.round((clientY - rect.top) / scale), 0, natural.height),
    };
  }, [natural]);

  // Layout width, not getBoundingClientRect: the dialog's zoom-in animation is a CSS transform, so
  // a rect measured mid-animation is ~95% size and the overlays would render offset until re-render.
  const scale = natural && imgRef.current ? imgRef.current.clientWidth / natural.width || 1 : 1;
  const guideBounds: Bounds = garmentBounds ?? { x: 0, y: 0, width: natural?.width ?? 0, height: natural?.height ?? 0 };
  const centerTarget = { centerX: guideBounds.x + guideBounds.width / 2, centerY: guideBounds.y + guideBounds.height / 2 };

  // The composite cuts the design to the garment, so what lies off it is shown cut and called out.
  const garmentMask = garmentMaskUrl && loadedMask?.url === garmentMaskUrl ? loadedMask.mask : null;
  const printed = overlayImageUrl && overlaySize ? fitInside(value, overlaySize) : value;
  const offGarment = garmentMask && natural && !editingGarment ? shareOffGarment(garmentMask, printed, natural) : 0;
  const isOffGarment = offGarment > OFF_GARMENT_TOLERANCE;
  const printedThing = overlayImageUrl ? "design" : "print area";

  const interactive = editingGarment || !disabled;
  const activeRect: Bounds = editingGarment ? guideBounds : value;
  const setActive = (next: Bounds) => (editingGarment ? setGarmentBounds(next) : onChange(next));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !natural) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>("[data-handle]")?.dataset.handle as Handle | undefined;
    const onRect = target.closest("[data-rect]");

    if (handle) {
      dragRef.current = { mode: "resize", handle, origin: activeRect };
    } else if (onRect) {
      const point = toNatural(event.clientX, event.clientY);
      dragRef.current = { mode: "move", startX: point.x, startY: point.y, origin: activeRect };
    } else {
      const anchor = toNatural(event.clientX, event.clientY);
      dragRef.current = { mode: "new", anchorX: anchor.x, anchorY: anchor.y };
      setActive({ x: anchor.x, y: anchor.y, width: 1, height: 1 });
    }
    wrapRef.current?.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !natural) return;
    const point = toNatural(event.clientX, event.clientY);
    let next: Bounds;

    if (drag.mode === "new") {
      const x0 = Math.min(drag.anchorX, point.x), x1 = Math.max(drag.anchorX, point.x);
      const y0 = Math.min(drag.anchorY, point.y), y1 = Math.max(drag.anchorY, point.y);
      next = { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
    } else if (drag.mode === "move") {
      next = {
        x: clamp(drag.origin.x + point.x - drag.startX, 0, natural.width - drag.origin.width),
        y: clamp(drag.origin.y + point.y - drag.startY, 0, natural.height - drag.origin.height),
        width: drag.origin.width,
        height: drag.origin.height,
      };
    } else {
      const o = drag.origin;
      let left = o.x, top = o.y, right = o.x + o.width, bottom = o.y + o.height;
      if (drag.handle === "nw" || drag.handle === "ne") top = clamp(point.y, 0, bottom - 1);
      if (drag.handle === "sw" || drag.handle === "se") bottom = clamp(point.y, top + 1, natural.height);
      if (drag.handle === "nw" || drag.handle === "sw") left = clamp(point.x, 0, right - 1);
      if (drag.handle === "ne" || drag.handle === "se") right = clamp(point.x, left + 1, natural.width);
      next = { x: left, y: top, width: right - left, height: bottom - top };
    }

    if (editingGarment) {
      setGarmentBounds(next);
      return;
    }
    const snapped = snapToCenter(next, centerTarget, scale);
    setSnap(snapped.snap);
    onChange(snapped.rect);
  };

  const endDrag = () => {
    dragRef.current = null;
    setSnap({ h: false, v: false });
  };

  const toggleGarmentEditing = () => {
    if (!editingGarment && !garmentBounds && natural) {
      setGarmentBounds({ x: 0, y: 0, width: natural.width, height: natural.height });
    }
    setEditingGarment((current) => !current);
  };

  const boxStyle = (b: Bounds) => ({ left: b.x * scale, top: b.y * scale, width: b.width * scale, height: b.height * scale });

  return (
    <div className="space-y-1.5">
      <div
        ref={wrapRef}
        className={cn("relative inline-block max-w-full leading-none", interactive ? "cursor-crosshair" : "cursor-default")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Plain <img>: pointer math needs getBoundingClientRect on a live element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Mock-up base photo"
          className="block max-h-105 max-w-full rounded-lg ring-1 ring-slate-200 select-none ring-inset"
          draggable={false}
          crossOrigin="anonymous" // required to read pixels back for garment detection
          onLoad={(event) => {
            const img = event.currentTarget;
            const size = pixelSize ?? { width: img.naturalWidth, height: img.naturalHeight };
            const detected = detectGarmentBounds(img);
            const kx = size.width / img.naturalWidth;
            const ky = size.height / img.naturalHeight;
            setNatural(size);
            setGarmentBounds(
              detected && {
                x: Math.round(detected.x * kx),
                y: Math.round(detected.y * ky),
                width: Math.round(detected.width * kx),
                height: Math.round(detected.height * ky),
              }
            );
          }}
        />
        {natural && garmentTint && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg mix-blend-multiply"
            style={{
              backgroundColor: garmentTint.color,
              maskImage: `url(${garmentTint.maskUrl})`,
              WebkitMaskImage: `url(${garmentTint.maskUrl})`,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
            }}
          />
        )}
        {natural && (
          <div
            data-rect={editingGarment ? undefined : ""}
            className={cn(
              "absolute overflow-hidden border-2",
              isOffGarment ? "border-amber-500" : "border-primary",
              !overlayImageUrl && (isOffGarment ? "bg-amber-500/15" : "bg-primary/15"),
              editingGarment ? "pointer-events-none opacity-40" : disabled ? "cursor-default" : "cursor-move"
            )}
            style={boxStyle(value)}
          >
            {overlayImageUrl && (
              // Masked with the garment, positioned as the whole photo, so the design shows cut where the composite cuts it.
              <div
                className="pointer-events-none absolute inset-0"
                style={
                  garmentMaskUrl
                    ? {
                        maskImage: `url(${garmentMaskUrl})`,
                        WebkitMaskImage: `url(${garmentMaskUrl})`,
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskSize: `${natural.width * scale}px ${natural.height * scale}px`,
                        WebkitMaskSize: `${natural.width * scale}px ${natural.height * scale}px`,
                        maskPosition: `${-(value.x * scale + BOX_BORDER_PX)}px ${-(value.y * scale + BOX_BORDER_PX)}px`,
                        WebkitMaskPosition: `${-(value.x * scale + BOX_BORDER_PX)}px ${-(value.y * scale + BOX_BORDER_PX)}px`,
                      }
                    : undefined
                }
              >
                {/* object-contain mirrors Cloudinary's c_fit transformation. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overlayImageUrl}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full object-contain"
                  onLoad={(event) => setOverlaySize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                />
              </div>
            )}
            {!disabled && !editingGarment && <Handles className={isOffGarment ? "border-amber-500" : "border-primary"} />}
          </div>
        )}
        {garmentBounds && (
          <div
            data-rect={editingGarment ? "" : undefined}
            className={cn(
              "absolute border-amber-500",
              editingGarment ? "cursor-move border-2 bg-amber-500/10" : "pointer-events-none border border-dashed"
            )}
            style={boxStyle(garmentBounds)}
          >
            <span className="absolute -top-5 left-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
              Garment
            </span>
            {editingGarment && <Handles className="border-amber-500" />}
          </div>
        )}
        {snap.h && (
          <div
            className="pointer-events-none absolute w-px -translate-x-1/2 bg-pink-500"
            style={{ left: centerTarget.centerX * scale, top: guideBounds.y * scale, height: guideBounds.height * scale }}
          />
        )}
        {snap.v && (
          <div
            className="pointer-events-none absolute h-px -translate-y-1/2 bg-pink-500"
            style={{ top: centerTarget.centerY * scale, left: guideBounds.x * scale, width: guideBounds.width * scale }}
          />
        )}
      </div>
      {isOffGarment && (
        <p role="status" className="text-xs text-amber-700">
          {offGarment > 1 - OFF_GARMENT_TOLERANCE
            ? `The ${printedThing} is entirely off the garment, so nothing of it would be printed. Move it onto the garment.`
            : `Part of the ${printedThing} is off the garment. Mock-ups cut it off at the garment’s edge.`}
        </p>
      )}
      {natural && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            {editingGarment
              ? "Drag the amber box to fit the garment exactly, then click Done."
              : garmentBounds
                ? "Snaps to the center of the amber garment box. Wrong? Adjust it."
                : "Snaps to the photo's center — mark the garment area for better centering."}
          </p>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={toggleGarmentEditing}>
            {editingGarment ? "Done" : "Adjust garment area"}
          </Button>
        </div>
      )}
    </div>
  );
};
