"use client";

import Image from "next/image";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { areaLabel, normalizeRotation } from "@/helpers/mockup-template";
import type { MockupArea } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

/** A design that can be printed in a print area besides the mock-up's own. */
export type AreaDesignOption = { id: string; label: string; imageUrl?: string | null };

type PrintAreaListProps = {
  areas: MockupArea[];
  activeKey: string;
  onSelect: (key: string) => void;
  onChange: (areas: MockupArea[]) => void;
  disabled?: boolean;
  /**
   * "template": a photo's print area, which prints the mock-up's design.
   * "mockup": the print area of one mock-up, which can print another design of the job instead.
   */
  mode: "template" | "mockup";
  /** In "mockup" mode, the other designs the area can print. */
  designs?: AreaDesignOption[];
  /** In "mockup" mode, a picture of the mock-up's own design, shown beside its choice. */
  ownDesignUrl?: string | null;
};

// A small picture of a design beside its name in the list.
const DesignOption = ({ label, imageUrl }: { label: string; imageUrl?: string | null }) => (
  <span className="flex min-w-0 items-center gap-2">
    {imageUrl ? (
      <Image
        src={imageUrl}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="bg-card size-7 shrink-0 rounded border object-contain"
      />
    ) : (
      <span
        aria-hidden="true"
        className="bg-ink-50 size-7 shrink-0 rounded border border-dashed"
      />
    )}
    <span className="truncate">{label}</span>
  </span>
);

const sourceValue = (area: MockupArea) =>
  area.source === "design" && area.designImageId
    ? `design:${area.designImageId}`
    : area.source === "design"
      ? "same"
      : area.source;

const NumberField = ({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) => (
  <label className="flex min-w-0 flex-col gap-0.5">
    <span className="text-muted-foreground text-[11px]">{label}</span>
    <Input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      disabled={disabled}
      className="h-8 px-2 text-xs tabular-nums"
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(next);
      }}
    />
  </label>
);

/**
 * The print area of a photo: each photo (front, back, a sleeve) has one, placed by dragging it on the photo. Here it is
 * turned, set exactly by numbers, and, for one mock-up, given another design to print.
 */
export const PrintAreaList = ({
  areas,
  activeKey,
  onSelect,
  onChange,
  disabled = false,
  mode,
  designs = [],
  ownDesignUrl = null,
}: PrintAreaListProps) => {
  const active = areas.find((area) => area.key === activeKey) ?? areas[0];
  if (!active) return null;
  const update = (patch: Partial<MockupArea>) =>
    onChange(areas.map((area) => (area.key === active.key ? { ...area, ...patch } : area)));
  // Another design only makes sense on a mock-up; with a single area, printing nothing would make no mock-up at all.
  const showSource = mode === "mockup" && (designs.length > 0 || areas.length > 1);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-ink-900 text-sm font-medium">Print area</p>
        <p className="text-muted-foreground text-xs">
          Drag the box on the photo to place the design. The round handle above it turns it.
        </p>
      </div>

      {/* Templates made before each photo had one area may still have several. */}
      {areas.length > 1 && (
        <div role="tablist" aria-label="Print areas" className="flex flex-wrap gap-1.5">
          {areas.map((area, index) => (
            <button
              key={area.key}
              type="button"
              role="tab"
              aria-selected={area.key === active.key}
              onClick={() => onSelect(area.key)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                area.key === active.key
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-ink-200 text-ink-700 hover:bg-ink-50"
              )}
            >
              {areaLabel(area, index)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="w-24">
          <NumberField
            label="Angle (°)"
            value={active.rotation}
            min={-180}
            max={180}
            disabled={disabled}
            onChange={(rotation) => update({ rotation: normalizeRotation(rotation) })}
          />
        </div>
        {active.rotation !== 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            disabled={disabled}
            onClick={() => update({ rotation: 0 })}
          >
            <RotateCw className="size-3" aria-hidden="true" />
            Straighten
          </Button>
        )}
      </div>

      {showSource && (
        <label className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-[11px]">Prints</span>
          <Select
            value={sourceValue(active)}
            disabled={disabled}
            onValueChange={(value) => {
              if (!value) return;
              if (value.startsWith("design:"))
                update({ source: "design", designImageId: value.slice("design:".length) });
              else update({ source: value as MockupArea["source"], designImageId: null });
            }}
          >
            <SelectTrigger className="h-10 w-full text-xs" aria-label="What this area prints">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same" className="text-xs">
                <DesignOption label="The mock-up’s design" imageUrl={ownDesignUrl} />
              </SelectItem>
              {designs.map((design) => (
                <SelectItem key={design.id} value={`design:${design.id}`} className="text-xs">
                  <DesignOption label={design.label} imageUrl={design.imageUrl} />
                </SelectItem>
              ))}
              {areas.length > 1 && (
                <SelectItem value="none" className="text-xs">
                  Nothing
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </label>
      )}

      <details>
        <summary className="text-muted-foreground hover:text-ink-700 cursor-pointer text-xs select-none">
          Exact position
        </summary>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <NumberField
            label="X"
            value={active.x}
            min={0}
            disabled={disabled}
            onChange={(x) => update({ x: Math.max(0, Math.round(x)) })}
          />
          <NumberField
            label="Y"
            value={active.y}
            min={0}
            disabled={disabled}
            onChange={(y) => update({ y: Math.max(0, Math.round(y)) })}
          />
          <NumberField
            label="Width"
            value={active.width}
            min={1}
            disabled={disabled}
            onChange={(width) => update({ width: Math.max(1, Math.round(width)) })}
          />
          <NumberField
            label="Height"
            value={active.height}
            min={1}
            disabled={disabled}
            onChange={(height) => update({ height: Math.max(1, Math.round(height)) })}
          />
        </div>
      </details>
    </div>
  );
};
