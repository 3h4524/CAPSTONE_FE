"use client";

import { useMemo } from "react";

import { VersionChip } from "@/components/admin/image-quality/evaluation/version-chip";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type ImageEvalSide,
  isSameImageEvalSelection,
  toggleImageEvalVersion,
} from "@/helpers/image-eval-selection";
import type {
  ImageEvalPreset,
  ImageEvalSelection,
  ImageEvalVersion,
} from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type VersionPickerProps = {
  versions: ImageEvalVersion[];
  presets: ImageEvalPreset[];
  selection: ImageEvalSelection;
  onChange: (selection: ImageEvalSelection) => void;
};

const SIDES: ReadonlyArray<{ side: ImageEvalSide; title: string; tone: string }> = [
  { side: "before", title: "Before", tone: "bg-ink-50" },
  { side: "after", title: "After", tone: "bg-sky-50/60 dark:bg-sky-500/10" },
];

export const VersionPicker = ({ versions, presets, selection, onChange }: VersionPickerProps) => {
  const orderedVersions = useMemo(
    () => [...versions].sort((left, right) => left.order - right.order),
    [versions]
  );
  const isMissingSide = selection.before.length === 0 || selection.after.length === 0;

  return (
    <SectionCard
      title="What to compare"
      description="Start from a quick pick, or choose the prompt versions on each side yourself. A dropped trial is a variant that was tested and not kept."
    >
      {presets.length > 0 ? (
        <div className="border-ink-100 flex flex-wrap items-center gap-2 border-b px-5 py-3.5 max-md:px-4 sm:px-6">
          <span className="text-ink-600 text-xs font-semibold">Quick picks</span>
          {presets.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              size="sm"
              variant={isSameImageEvalSelection(preset.selection, selection) ? "default" : "outline"}
              onClick={() => onChange(preset.selection)}
              className="h-8 text-[13px] max-md:h-auto max-md:min-h-9 max-md:w-full max-md:justify-start max-md:py-1.5 max-md:text-left max-md:whitespace-normal"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 p-5 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 max-md:p-4 sm:px-6 xl:grid-cols-2">
        {SIDES.map(({ side, title, tone }) => (
          <fieldset key={side} className={cn("min-w-0 rounded-lg p-4 max-md:p-3", tone)}>
            <legend className="sr-only">{title}</legend>
            <p className="text-ink-800 mb-3 text-sm font-semibold">
              {title}{" "}
              <span className="text-ink-500 font-normal">· {selection[side].length} selected</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {orderedVersions.map((version) => (
                <VersionChip
                  key={version.key}
                  version={version}
                  isSelected={selection[side].includes(version.key)}
                  onToggle={() => onChange(toggleImageEvalVersion(selection, side, version.key))}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="border-ink-100 flex flex-col gap-3 border-t px-5 py-4 max-md:px-4 sm:flex-row sm:flex-wrap sm:gap-8 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Switch
            id="image-eval-same-products"
            checked={selection.isSameProductsOnly}
            onCheckedChange={(checked) => onChange({ ...selection, isSameProductsOnly: checked })}
          />
          <Label htmlFor="image-eval-same-products" className="text-ink-700 text-[13px] font-normal max-md:leading-snug">
            Only products that have images on both sides
          </Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch
            id="image-eval-newest"
            checked={selection.isNewestPerProduct}
            onCheckedChange={(checked) => onChange({ ...selection, isNewestPerProduct: checked })}
          />
          <Label htmlFor="image-eval-newest" className="text-ink-700 text-[13px] font-normal max-md:leading-snug">
            After: only the newest version of each product
          </Label>
        </div>
      </div>
      {isMissingSide ? (
        <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-[13px] text-amber-800 sm:px-6 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Pick at least one version on each side to see a comparison.
        </p>
      ) : null}
    </SectionCard>
  );
};
