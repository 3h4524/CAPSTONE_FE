"use client";

import { useState } from "react";

import { MockupTemplateCard } from "@/components/batch-setup/mockup-template/mockup-template-card";
import { MockupTemplateDetail } from "@/components/batch-setup/mockup-template/mockup-template-detail";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { MAX_GARMENT_COLORS } from "@/helpers/garment-colors";
import { MAX_MOCKUP_SELECTION, productTypeLabel } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplatePickerContentProps = {
  templates: MockupTemplate[];
  initialIds: string[];
  initialColors: string[];
  pending: boolean;
  /** Product types in the batch job (lowercase) with how many products each has. */
  productTypeCounts?: Record<string, number>;
  onApply: (selectedIds: string[], garmentColors: string[]) => void;
  onClose: () => void;
};

export const MockupTemplatePickerContent = ({ templates, initialIds, initialColors, pending, productTypeCounts, onApply, onClose }: MockupTemplatePickerContentProps) => {
  const [draftIds, setDraftIds] = useState(initialIds);
  const [draftColors, setDraftColors] = useState(initialColors);
  const recolorSelected = templates.some((template) => template.allowRecolor && draftIds.includes(template.id));
  const focusedTemplate = templates.find((template) => draftIds.includes(template.id)) ?? null;
  const tooMany = draftIds.length > MAX_MOCKUP_SELECTION;

  const toggleId = (id: string) =>
    setDraftIds((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));

  // With the job's product types known, only templates that can actually be used are listed, grouped
  // by type — the backend rejects a template whose type no product in the job has.
  const groups = productTypeCounts
    ? Object.entries(productTypeCounts).map(([type, count]) => ({
        type,
        count,
        items: templates.filter((template) => template.productType.toLowerCase() === type),
      }))
    : [{ type: "", count: 0, items: templates }];
  const uncovered = groups.filter((group) => group.type && !group.items.some((template) => draftIds.includes(template.id)));

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-h-0 overflow-y-auto pr-1" role="group" aria-label="Mock-up templates">
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.type || "all"} className="flex flex-col gap-2">
                {group.type && (
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{productTypeLabel(group.type)}</h3>
                    <span className="text-muted-foreground text-xs">
                      {group.count} {group.count === 1 ? "product" : "products"}
                    </span>
                    {group.items.some((template) => draftIds.includes(template.id)) ? (
                      <Badge variant="secondary">Covered</Badge>
                    ) : (
                      <Badge variant="outline">No template selected</Badge>
                    )}
                  </div>
                )}
                {group.items.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                    No {productTypeLabel(group.type)} template yet. Add one on the Mock-up Templates page.
                  </p>
                ) : (
                  group.items.map((template) => (
                    <MockupTemplateCard key={template.id} template={template} selected={draftIds.includes(template.id)} onToggle={toggleId} />
                  ))
                )}
              </section>
            ))}
          </div>
        </div>
        <div className="hidden min-h-0 md:block">
          <MockupTemplateDetail template={focusedTemplate} />
        </div>
      </div>
      {recolorSelected && (
        <div className="space-y-2 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Garment colors</p>
            <p className="text-muted-foreground text-xs">
              Recolorable templates get one mock-up per color (up to {MAX_GARMENT_COLORS}). None keeps the photo’s own color.
            </p>
          </div>
          <GarmentColorPicker
            selected={draftColors}
            max={MAX_GARMENT_COLORS}
            disabled={pending}
            onToggle={(hex) =>
              setDraftColors((previous) =>
                previous.some((value) => value.toLowerCase() === hex.toLowerCase())
                  ? previous.filter((value) => value.toLowerCase() !== hex.toLowerCase())
                  : [...previous, hex]
              )
            }
          />
        </div>
      )}
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {draftIds.length} of {MAX_MOCKUP_SELECTION} selected
        {tooMany
          ? " — remove some to apply."
          : draftIds.length === 0
            ? " — select at least one template."
            : uncovered.length > 0
              ? ` — no mock-up will be made for: ${uncovered.map((group) => productTypeLabel(group.type)).join(", ")}.`
              : ""}
      </p>
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={pending || draftIds.length === 0 || tooMany} onClick={() => onApply(draftIds, recolorSelected ? draftColors : [])}>
          Apply mock-ups
        </Button>
      </DialogFooter>
    </>
  );
};
