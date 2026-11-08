"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MockupAsset, Region } from "@/types/video-workflow";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function AiStartFrameCropDialog({
  asset, sceneNumber, landscape, initialCrop, automaticCrop, onClose, onSave,
}: {
  asset: MockupAsset;
  sceneNumber: number;
  landscape: boolean;
  initialCrop?: Region | null;
  automaticCrop?: Region | null;
  onClose: () => void;
  onSave: (crop: Region | null) => void;
}) {
  const imageRatio = asset.width / asset.height;
  const targetRatio = landscape ? 16 / 9 : 9 / 16;
  const baseWidth = Math.min(1, targetRatio / imageRatio);
  const baseHeight = Math.min(1, imageRatio / targetRatio);
  const fitCrop = (region: Region): Region => {
    const width = Math.min(region.width, (targetRatio / imageRatio) * region.height);
    const height = Math.min(region.height, (imageRatio / targetRatio) * region.width);
    return { x: region.x + (region.width - width) / 2, y: region.y + (region.height - height) / 2, width, height };
  };
  const defaultCrop = fitCrop(automaticCrop ?? { x: 0, y: 0, width: 1, height: 1 });
  const startingCrop = initialCrop ? fitCrop(initialCrop) : defaultCrop;
  const position = (offset: number, size: number) => size >= 1 - 1e-9 ? 0.5 : clamp(offset / (1 - size), 0, 1);
  const defaultZoom = baseWidth / defaultCrop.width;
  const startingZoom = baseWidth / startingCrop.width;
  const maxZoom = Math.max(4, defaultZoom, startingZoom);
  const [zoom, setZoom] = useState(startingZoom);
  const [x, setX] = useState(() => position(startingCrop.x, startingCrop.width));
  const [y, setY] = useState(() => position(startingCrop.y, startingCrop.height));
  const [useOriginal, setUseOriginal] = useState(!initialCrop);
  const drag = useRef<{ x: number; y: number; crop: Region; width: number; height: number } | null>(null);
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;
  const crop: Region = { x: (1 - width) * x, y: (1 - height) * y, width, height };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Edit start frame</DialogTitle>
          <DialogDescription>Scene {sceneNumber} · Drag the image and adjust the zoom to frame the detail you want.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div
            className="bg-muted relative mx-auto max-h-[45dvh] w-full cursor-grab touch-none overflow-hidden rounded-lg active:cursor-grabbing"
            style={{ aspectRatio: landscape ? "16 / 9" : "9 / 16", maxWidth: landscape ? "min(100%, 80dvh)" : "min(240px, 25.3125dvh)" }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              drag.current = { x: event.clientX, y: event.clientY, crop, width: bounds.width, height: bounds.height };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (!start) return;
              const nextX = clamp(start.crop.x - ((event.clientX - start.x) / start.width) * start.crop.width, 0, 1 - start.crop.width);
              const nextY = clamp(start.crop.y - ((event.clientY - start.y) / start.height) * start.crop.height, 0, 1 - start.crop.height);
              setX((1 - start.crop.width) > 0 ? nextX / (1 - start.crop.width) : 0.5);
              setY((1 - start.crop.height) > 0 ? nextY / (1 - start.crop.height) : 0.5);
              setUseOriginal(false);
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          >
            <Image src={asset.previewUrl} alt={`Start frame preview for scene ${sceneNumber}`} width={asset.width} height={asset.height} unoptimized draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%` }} />
          </div>
          <div className="space-y-3">
            {([
              { label: "Zoom", value: zoom, min: 1, max: maxZoom, step: 0.01, display: `${zoom.toFixed(1)}×`, set: setZoom },
              { label: "Horizontal position", value: x, min: 0, max: 1, step: 0.01, display: `${Math.round(x * 100)}%`, set: setX },
              { label: "Vertical position", value: y, min: 0, max: 1, step: 0.01, display: `${Math.round(y * 100)}%`, set: setY },
            ] as const).map((control) => (
              <label key={control.label} className="block space-y-1.5 text-xs font-medium">
                <span className="flex justify-between gap-3"><span>{control.label}</span><span className="text-muted-foreground tabular-nums">{control.display}</span></span>
                <input type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={(event) => { control.set(Number(event.target.value)); setUseOriginal(false); }} className="accent-primary w-full cursor-pointer" />
              </label>
            ))}
          </div>
        </div>
        <DialogFooter className="border-t px-5 py-4">
          <Button type="button" variant="ghost" onClick={() => { setZoom(defaultZoom); setX(position(defaultCrop.x, defaultCrop.width)); setY(position(defaultCrop.y, defaultCrop.height)); setUseOriginal(true); }}><RotateCcw aria-hidden="true" />Reset</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSave(useOriginal ? null : crop)}>Save crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
