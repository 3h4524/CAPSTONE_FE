"use client";

import { type KeyboardEvent, type PointerEvent,useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Focus, Maximize2, Minimize2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createRegion, moveRegion, resizeRegion } from "@/helpers/regions";
import type { MockupRegions, Region } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

type RegionName = "product" | "artwork" | "detail";
type DragState = { kind: "draw" | "move" | "resize"; name: RegionName; start: { x: number; y: number }; initial: Region | null };

const regionLabels: Record<RegionName, string> = { product: "Product", artwork: "Artwork", detail: "Detail" };
const colors: Record<RegionName, string> = {
  product: "border-sky-500 bg-sky-500/15",
  artwork: "border-violet-500 bg-violet-500/15",
  detail: "border-amber-500 bg-amber-500/15",
};

export const RegionEditor = ({ imageUrl, width, height, value, onChange }: {
  imageUrl: string;
  width: number;
  height: number;
  value: MockupRegions;
  onChange: (value: MockupRegions) => void;
}) => {
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const [active, setActive] = useState<RegionName>("product");

  const normalizedPoint = (event: PointerEvent) => {
    const bounds = surface.current?.getBoundingClientRect();
    if (!bounds) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    };
  };
  const setRegion = (name: RegionName, region: Region | null) => onChange({ ...value, [name]: region });
  const startDrag = (event: PointerEvent, kind: DragState["kind"], name: RegionName, initial: Region | null) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = normalizedPoint(event);
    drag.current = { kind, name, start: point, initial };
    surface.current?.setPointerCapture(event.pointerId);
    if (kind === "draw") setRegion(name, createRegion(point, point));
  };
  const handlePointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const point = normalizedPoint(event);
    if (current.kind === "draw") setRegion(current.name, createRegion(current.start, point));
    if (current.kind === "move" && current.initial)
      setRegion(current.name, moveRegion(current.initial, point.x - current.start.x, point.y - current.start.y));
    if (current.kind === "resize" && current.initial)
      setRegion(current.name, resizeRegion(current.initial, point.x - current.start.x, point.y - current.start.y));
  };
  const finishDrag = (event: PointerEvent) => {
    drag.current = null;
    if (surface.current?.hasPointerCapture(event.pointerId)) surface.current.releasePointerCapture(event.pointerId);
  };
  const adjustWithKeyboard = (event: KeyboardEvent, kind: "move" | "resize") => {
    const region = value[active];
    if (!region || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.01;
    const x = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const y = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    setRegion(active, kind === "move" ? moveRegion(region, x, y) : resizeRegion(region, x, y));
  };
  const nudge = (x: number, y: number) => {
    const region = value[active];
    if (region) setRegion(active, moveRegion(region, x, y));
  };
  const resize = (amount: number) => {
    const region = value[active];
    if (region) setRegion(active, resizeRegion(region, amount, amount));
  };

  return <fieldset className="space-y-3">
    <legend className="text-sm font-medium">Protected image regions</legend>
    <p className="text-muted-foreground text-xs">Choose a region, then drag on the image to draw it. Protected areas stay visible during video motion.</p>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Region type">
      {(Object.keys(regionLabels) as RegionName[]).map(name => <Button key={name} type="button" size="sm" variant={active === name ? "default" : "outline"} aria-pressed={active === name} onClick={() => setActive(name)}>
        {regionLabels[name]}{value[name] ? " ✓" : ""}
      </Button>)}
    </div>
    <div ref={surface} className="bg-muted/30 focus-visible:ring-ring relative mx-auto w-full max-w-md touch-none overflow-hidden rounded-lg border outline-none focus-visible:ring-2" style={{ aspectRatio: `${width} / ${height}` }} onPointerDown={event => startDrag(event, "draw", active, null)} onPointerMove={handlePointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} aria-label={`Draw ${regionLabels[active]} region on image`}>
      <Image src={imageUrl} alt="Mockup for region editing" fill sizes="(max-width: 768px) 100vw, 28rem" unoptimized className="pointer-events-none object-contain" />
      {(Object.keys(regionLabels) as RegionName[]).map(name => {
        const region = value[name];
        if (!region) return null;
        return <div key={name} role="button" tabIndex={active === name ? 0 : -1} aria-label={`${regionLabels[name]} region. Use arrow keys to move; hold Shift for larger steps.`} className={cn("focus-visible:ring-ring absolute cursor-move border-2 outline-none focus-visible:ring-2", colors[name], active !== name && "opacity-60")} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} onFocus={() => setActive(name)} onPointerDown={event => { setActive(name); startDrag(event, "move", name, region); }} onKeyDown={event => adjustWithKeyboard(event, "move")}>
          <span className="bg-background/90 absolute top-1 left-1 rounded px-1 text-[10px] font-semibold">{regionLabels[name]}</span>
          {active === name && <button type="button" className="border-background bg-foreground focus-visible:ring-ring absolute -right-2 -bottom-2 size-5 cursor-se-resize rounded-sm border-2 outline-none focus-visible:ring-2" aria-label={`Resize ${regionLabels[name]} region. Use arrow keys to resize.`} onPointerDown={event => startDrag(event, "resize", name, region)} onKeyDown={event => adjustWithKeyboard(event, "resize")} />}
        </div>;
      })}
      {value.focalPoint && <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow" style={{ left: `${value.focalPoint.x * 100}%`, top: `${value.focalPoint.y * 100}%` }} aria-hidden="true" />}
    </div>
    <div className="flex flex-wrap gap-2" aria-label={`${regionLabels[active]} region controls`}>
      {!value[active] && <Button type="button" size="sm" variant="outline" onClick={() => setRegion(active, { x: 0.2, y: 0.2, width: 0.6, height: 0.6 })}>Add {regionLabels[active]} region</Button>}
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Move ${regionLabels[active]} left`} disabled={!value[active]} onClick={() => nudge(-0.02, 0)}><ArrowLeft className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Move ${regionLabels[active]} right`} disabled={!value[active]} onClick={() => nudge(0.02, 0)}><ArrowRight className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Move ${regionLabels[active]} up`} disabled={!value[active]} onClick={() => nudge(0, -0.02)}><ArrowUp className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Move ${regionLabels[active]} down`} disabled={!value[active]} onClick={() => nudge(0, 0.02)}><ArrowDown className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Shrink ${regionLabels[active]}`} disabled={!value[active]} onClick={() => resize(-0.04)}><Minimize2 className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Grow ${regionLabels[active]}`} disabled={!value[active]} onClick={() => resize(0.04)}><Maximize2 className="size-4" /></Button>
      <Button type="button" size="icon-sm" variant="outline" aria-label={`Delete ${regionLabels[active]} region`} disabled={!value[active]} onClick={() => setRegion(active, null)}><Trash2 className="size-4" /></Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, focalPoint: { x: 0.5, y: 0.5 } })}><Focus className="size-4" />Center focal point</Button>
    </div>
  </fieldset>;
};
