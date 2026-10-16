"use client";

import { useState } from "react";

import { MockupTemplateCard } from "@/components/batch-setup/mockup-template/mockup-template-card";
import { MockupTemplateDetail } from "@/components/batch-setup/mockup-template/mockup-template-detail";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  defaultTemplateColors,
  garmentColorName,
  MAX_GARMENT_COLORS,
  resolveTemplateColors,
  type TemplateColors,
} from "@/helpers/garment-colors";
import { MAX_MOCKUP_SELECTION, productTypeLabel } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplatePickerContentProps = {
  templates: MockupTemplate[];
  initialIds: string[];
  /** Colors shared by every template, as older selections were saved; used for templates with none of their own. */
  initialColors?: string[];
  /** Colors picked per template, keyed by template id. */
  initialTemplateColors?: TemplateColors;
  pending: boolean;
  /** Product types in the batch job (lowercase) with how many products each has. */
  productTypeCounts?: Record<string, number>;
  /** A generated design shown inside each template's print area in the preview. */
  sampleDesignUrl?: string | null;
  onApply: (selectedIds: string[], templateColors: TemplateColors) => void;
  onClose: () => void;
};

export const MockupTemplatePickerContent = ({
  templates,
  initialIds,
  initialColors = [],
  initialTemplateColors,
  pending,
  productTypeCounts,
  sampleDesignUrl,
  onApply,
  onClose,
}: MockupTemplatePickerContentProps) => {
  const [draftIds, setDraftIds] = useState(initialIds);
  const [draftColors, setDraftColors] = useState<TemplateColors>(() =>
    resolveTemplateColors(templates, initialIds, initialTemplateColors, initialColors)
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const tooMany = draftIds.length > MAX_MOCKUP_SELECTION;

  const toggleId = (id: string) => {
    const adding = !draftIds.includes(id);
    setDraftIds((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));
    setFocusedId(id);

    // A template ticked for the first time starts with the color its garment already has ticked.
    const template = templates.find((item) => item.id === id);
    if (adding && template && (draftColors[id] ?? []).length === 0) {
      const defaults = defaultTemplateColors(template);
      if (defaults.length > 0) setDraftColors((previous) => ({ ...previous, [id]: defaults }));
    }
  };

  const toggleColor = (templateId: string, hex: string) =>
    setDraftColors((previous) => {
      const current = previous[templateId] ?? [];
      const has = current.some((value) => value.toLowerCase() === hex.toLowerCase());
      return { ...previous, [templateId]: has ? current.filter((value) => value.toLowerCase() !== hex.toLowerCase()) : [...current, hex] };
    });

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

  // The preview follows the template the pointer is on, else the last one ticked, else the first listed.
  const listed = groups.flatMap((group) => group.items);
  const focusedTemplate =
    listed.find((template) => template.id === focusedId) ??
    listed.find((template) => draftIds.includes(template.id)) ??
    listed[0] ??
    null;

  // Colors only apply to recolorable templates that are ticked; a template with none made in its own color.
  const apply = () =>
    onApply(
      draftIds,
      Object.fromEntries(
        templates
          .filter((template) => template.allowRecolor && draftIds.includes(template.id))
          .map((template) => [template.id, draftColors[template.id] ?? []] as const)
          .filter(([, colors]) => colors.length > 0)
      )
    );

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
                  group.items.map((template) => {
                    const selected = draftIds.includes(template.id);
                    const colors = draftColors[template.id] ?? [];
                    const ownColor = defaultTemplateColors(template)[0];
                    return (
                      <div key={template.id} className="flex flex-col gap-2">
                        <MockupTemplateCard
                          template={template}
                          selected={selected}
                          onToggle={toggleId}
                          onFocusTemplate={setFocusedId}
                          colors={colors}
                        />
                        {selected && template.allowRecolor && (
                          <div className="ml-4 space-y-2 rounded-lg border border-dashed p-3">
                            <p className="text-xs font-medium text-slate-900">Garment colors for {template.name}</p>
                            <GarmentColorPicker
                              compact
                              selected={colors}
                              max={MAX_GARMENT_COLORS}
                              disabled={pending}
                              onToggle={(hex) => toggleColor(template.id, hex)}
                            />
                            <p className="text-muted-foreground text-xs">
                              {colors.length === 0
                                ? "None picked: made in the template's own color."
                                : `${colors.length} mock-up${colors.length === 1 ? "" : "s"} per product, one in each color.`}
                            </p>
                            {ownColor && !(colors.length === 1 && colors[0].toLowerCase() === ownColor.toLowerCase()) && (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                                disabled={pending}
                                onClick={() => setDraftColors((previous) => ({ ...previous, [template.id]: [ownColor] }))}
                              >
                                Use the template&apos;s own color ({garmentColorName(ownColor)})
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            ))}
          </div>
        </div>
        <div className="hidden min-h-0 md:block">
          <MockupTemplateDetail
            key={focusedTemplate?.id ?? "none"}
            template={focusedTemplate}
            colors={focusedTemplate ? (draftColors[focusedTemplate.id] ?? []) : []}
            designUrl={sampleDesignUrl}
          />
        </div>
      </div>
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
        <Button type="button" disabled={pending || draftIds.length === 0 || tooMany} onClick={apply}>
          Apply mock-ups
        </Button>
      </DialogFooter>
    </>
  );
};
