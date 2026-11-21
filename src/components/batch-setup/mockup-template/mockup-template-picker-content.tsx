"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MockupBackgroundChoice } from "@/components/batch-setup/mockup-template/mockup-background-choice";
import { MockupTemplateCard } from "@/components/batch-setup/mockup-template/mockup-template-card";
import { MockupTemplateDetail } from "@/components/batch-setup/mockup-template/mockup-template-detail";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupTemplateFormDialog } from "@/components/mockups/mockup-template-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import {
  carryColors,
  defaultTemplateColors,
  garmentColorName,
  MAX_GARMENT_COLORS,
  printifyStartColors,
  resolveTemplateColors,
  type TemplateColors,
} from "@/helpers/garment-colors";
import { backgroundKeys, backgroundsFor, type TemplateBackgrounds } from "@/helpers/mockup-backgrounds";
import { MAX_MOCKUP_SELECTION, productTypeLabel } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplatePickerContentProps = {
  templates: MockupTemplate[];
  initialIds: string[];
  /** Colors shared by every template, as older selections were saved; used for templates with none of their own. */
  initialColors?: string[];
  /** Colors picked per template, keyed by template id. */
  initialTemplateColors?: TemplateColors;
  /** Backgrounds picked per template, keyed by template id and then by garment color. */
  initialTemplateBackgrounds?: TemplateBackgrounds;
  pending: boolean;
  /** Product types in the batch job (lowercase) with how many products each has. */
  productTypeCounts?: Record<string, number>;
  /** A generated design shown inside each template's print area in the preview. */
  sampleDesignUrl?: string | null;
  onApply: (selectedIds: string[], templateColors: TemplateColors, templateBackgrounds: TemplateBackgrounds) => void;
  onClose: () => void;
  /**
   * The mock-ups are for a Printify product: only templates linked to Printify are offered, one per product type
   * (each product is made on one blueprint), and their colors are the blueprint's Printify colors.
   */
  printifyOnly?: boolean;
};

export const MockupTemplatePickerContent = ({
  templates,
  initialIds,
  initialColors = [],
  initialTemplateColors,
  initialTemplateBackgrounds = {},
  pending,
  productTypeCounts,
  sampleDesignUrl,
  onApply,
  onClose,
  printifyOnly = false,
}: MockupTemplatePickerContentProps) => {
  const { t } = useTranslation("common");
  // Templates a selection can hold; for a Printify product only the ones linked to Printify.
  const offered = printifyOnly ? templates.filter((template) => template.printify) : templates;
  const notPrintify = printifyOnly ? templates.filter((template) => initialIds.includes(template.id) && !template.printify) : [];
  // The selection starts from what this run can use. A template ticked earlier for a product type the run has
  // none of (its products were made in an earlier run) is not listed below, so it could never be unticked;
  // one that was deleted since is not listed anywhere. Both are left out, and applying removes them.
  const usable = (id: string) => {
    const template = offered.find((item) => item.id === id);
    return template !== undefined && (!productTypeCounts || template.productType.toLowerCase() in productTypeCounts);
  };
  const typeOf = (id: string) => templates.find((item) => item.id === id)?.productType.toLowerCase();
  // One template per product type. A selection saved before this rule keeps the first template of each type.
  const firstOfType = (id: string, index: number, ids: string[]) => ids.findIndex((other) => typeOf(other) === typeOf(id)) === index;
  const [draftIds, setDraftIds] = useState(() =>
    initialIds.filter((id) => usable(id)).filter((id, index, ids) => firstOfType(id, index, ids))
  );
  const leftOut = offered.filter((template) => initialIds.includes(template.id) && !usable(template.id));
  const usableIds = initialIds.filter((id) => usable(id));
  const extraOfType = templates.filter((template) => usableIds.includes(template.id) && !usableIds.filter((id, index, ids) => firstOfType(id, index, ids)).includes(template.id));
  // A Printify template is made only in its Printify colors: a color saved before from the fixed suggestions goes over
  // by name (Navy to its Navy), one it has no name for is dropped, and none left starts it in White.
  const [draftColors, setDraftColors] = useState<TemplateColors>(() =>
    Object.fromEntries(
      Object.entries(resolveTemplateColors(templates, initialIds, initialTemplateColors, initialColors)).map(([id, colors]) => {
        const template = templates.find((item) => item.id === id);
        if (!template?.printify) return [id, colors];
        // A Printify color matches itself by hex; a fixed suggestion matches by name.
        const carried = carryColors(colors, undefined, template.printify.colors).map((pair) => pair.to);
        return [id, carried.length > 0 ? carried : printifyStartColors(template)];
      })
    )
  );
  const [draftBackgrounds, setDraftBackgrounds] = useState<TemplateBackgrounds>(initialTemplateBackgrounds);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // The garment color each template is shown in. The preview and the background choice both follow it, so
  // switching the color in either one shows the same garment and the background that goes with it.
  const [shownColors, setShownColors] = useState<Record<string, string>>({});
  const showColor = (templateId: string, hex: string) => setShownColors((previous) => ({ ...previous, [templateId]: hex }));
  // The template being edited stays set while its dialog closes, so the form does not flash empty.
  const [editing, setEditing] = useState<{ template: MockupTemplate; open: boolean } | null>(null);
  const tooMany = draftIds.length > MAX_MOCKUP_SELECTION;

  // Ticking a template unticks the other one of its product type: each type is made on one template.
  const toggleId = (id: string) => {
    const adding = !draftIds.includes(id);
    setDraftIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous.filter((item) => typeOf(item) !== typeOf(id)), id]
    );
    setFocusedId(id);

    // A template ticked for the first time starts with the color its garment already has ticked.
    const template = templates.find((item) => item.id === id);
    if (adding && template && (draftColors[id] ?? []).length === 0) {
      const defaults = template.printify ? printifyStartColors(template) : defaultTemplateColors(template);
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
        items: offered.filter((template) => template.productType.toLowerCase() === type),
      }))
    : [{ type: "", count: 0, items: offered }];
  const uncovered = groups.filter((group) => group.type && !group.items.some((template) => draftIds.includes(template.id)));

  // The preview follows the template the pointer is on, else the last one ticked, else the first listed.
  const listed = groups.flatMap((group) => group.items);
  const focusedTemplate =
    listed.find((template) => template.id === focusedId) ??
    listed.find((template) => draftIds.includes(template.id)) ??
    listed[0] ??
    null;

  // A color that was unticked since falls back to the first one still ticked.
  const shownColorOf = (template: MockupTemplate) => {
    const colors = template.allowRecolor ? (draftColors[template.id] ?? []) : [];
    const chosen = shownColors[template.id]?.toLowerCase();
    return colors.find((hex) => hex.toLowerCase() === chosen) ?? colors[0];
  };

  // The garment colors a template's backgrounds are chosen for: the ones ticked for it, or one default.
  const backgroundKeysOf = (template: MockupTemplate) => backgroundKeys(template.allowRecolor ? (draftColors[template.id] ?? []) : []);

  // The other colors are written out first, so changing one never changes what the rest were showing.
  const setBackground = (template: MockupTemplate, key: string, hex: string | null) =>
    setDraftBackgrounds((previous) => {
      const { [key]: _replaced, ...others } = backgroundsFor(previous[template.id], backgroundKeysOf(template));
      return { ...previous, [template.id]: hex ? { ...others, [key]: hex } : others };
    });

  // Colors only apply to recolorable templates that are ticked; a template with none made in its own color.
  // A background likewise only goes with a ticked template whose garment can be lifted off its photo.
  const apply = () =>
    onApply(
      draftIds,
      Object.fromEntries(
        templates
          .filter((template) => template.allowRecolor && draftIds.includes(template.id))
          .map((template) => [template.id, draftColors[template.id] ?? []] as const)
          .filter(([, colors]) => colors.length > 0)
      ),
      Object.fromEntries(
        templates
          .filter((template) => template.allowBackground && draftIds.includes(template.id))
          .map((template) => [template.id, backgroundsFor(draftBackgrounds[template.id], backgroundKeysOf(template))] as const)
          .filter(([, backgrounds]) => Object.keys(backgrounds).length > 0)
      )
    );

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-h-0 overflow-y-auto pr-1" role="group" aria-label={t("batchSetup.mockup.templates")}>
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.type || "all"} className="flex flex-col gap-2">
                {group.type && (
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-ink-900 text-sm font-semibold">{productTypeLabel(group.type)}</h3>
                    <span className="text-muted-foreground text-xs">
                      {t("batchSetup.mockup.productCount", { count: group.count })}
                    </span>
                    {group.items.some((template) => draftIds.includes(template.id)) ? (
                      <Badge variant="secondary">{t("batchSetup.mockup.covered")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("batchSetup.mockup.noneSelected")}</Badge>
                    )}
                  </div>
                )}
                {group.items.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
                    {printifyOnly
                      ? t("batchSetup.mockup.noPrintifyTemplate", { type: productTypeLabel(group.type) })
                      : t("batchSetup.mockup.noTemplate", { type: productTypeLabel(group.type) })}
                  </p>
                ) : (
                  group.items.map((template) => {
                    const selected = draftIds.includes(template.id);
                    const colors = draftColors[template.id] ?? [];
                    // The template's own color is offered back only where any color can be picked.
                    const ownColor = template.printify ? undefined : defaultTemplateColors(template)[0];
                    return (
                      <div key={template.id} className="flex flex-col gap-2">
                        <div className="flex items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <MockupTemplateCard
                              template={template}
                              selected={selected}
                              onToggle={toggleId}
                              onFocusTemplate={setFocusedId}
                              colors={colors}
                            />
                            {template.printify && (
                              <p className="text-muted-foreground mt-1 truncate pl-1 text-xs">
                                Printify · {template.printify.blueprintTitle}
                                {template.printify.printProviderTitle ? ` · ${template.printify.printProviderTitle}` : ""}
                              </p>
                            )}
                          </div>
                          {/* Only the seller's own templates can be changed; the list refreshes when the edit is saved. */}
                          {template.isMine && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("batchSetup.mockup.editName", { name: template.name })}
                              title={t("batchSetup.mockup.editTemplate")}
                              disabled={pending}
                              onClick={() => setEditing({ template, open: true })}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                        </div>
                        {selected && template.allowRecolor && (
                          <div className="ml-4 space-y-2 rounded-lg border border-dashed p-3">
                            <p className="text-ink-900 text-xs font-medium">{t("batchSetup.mockup.colorsFor", { name: template.name })}</p>
                            <GarmentColorPicker
                              compact
                              selected={colors}
                              max={MAX_GARMENT_COLORS}
                              disabled={pending}
                              onToggle={(hex) => toggleColor(template.id, hex)}
                              palette={template.printify?.colors}
                              allowCustom={!template.printify}
                            />
                            <p className="text-muted-foreground text-xs">
                              {colors.length === 0
                                ? t("batchSetup.mockup.noColors")
                                : t("batchSetup.mockup.perProduct", { count: colors.length })}
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
                                {t("batchSetup.mockup.useOwnColor", { name: garmentColorName(ownColor) })}
                              </Button>
                            )}
                          </div>
                        )}
                        {selected && template.allowBackground && (
                          <MockupBackgroundChoice
                            template={template}
                            colors={template.allowRecolor ? colors : []}
                            shownColor={shownColorOf(template)}
                            backgrounds={draftBackgrounds[template.id]}
                            disabled={pending}
                            onShowColor={(hex) => {
                              showColor(template.id, hex);
                              // The preview moves to this template, so the garment is seen on the background being chosen.
                              setFocusedId(template.id);
                            }}
                            onChange={(key, hex) => setBackground(template, key, hex)}
                          />
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
            template={focusedTemplate}
            colors={focusedTemplate ? (draftColors[focusedTemplate.id] ?? []) : []}
            backgrounds={focusedTemplate?.allowBackground ? draftBackgrounds[focusedTemplate.id] : undefined}
            designUrl={sampleDesignUrl}
            shownColor={focusedTemplate ? shownColorOf(focusedTemplate) : undefined}
            onShowColor={(hex) => focusedTemplate && showColor(focusedTemplate.id, hex)}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {printifyOnly
          ? draftIds.length > 0
            ? t("batchSetup.mockup.printifySelected", { count: draftIds.length })
            : t("batchSetup.mockup.choosePrintify")
          : t("batchSetup.mockup.selectedOf", { count: draftIds.length, max: MAX_MOCKUP_SELECTION })}
        {tooMany
          ? ` — ${t("batchSetup.mockup.removeSome")}`
          : draftIds.length === 0
            ? printifyOnly ? "" : ` — ${t("batchSetup.mockup.selectOne")}`
            : ""}
      </p>
      <div aria-live="polite" className="empty:hidden">
        {draftIds.length > 0 && uncovered.length > 0 && (
          <PanelNotice tone="warning">
            {t("batchSetup.mockup.uncovered", {
              types: uncovered.map((group) => t(`batches.productTypes.${group.type}`, { defaultValue: productTypeLabel(group.type) })).join(", "),
            })}
          </PanelNotice>
        )}
      </div>
      {extraOfType.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("batchSetup.mockup.onePerType", { names: extraOfType.map((template) => template.name).join(", ") })}
        </p>
      )}
      {notPrintify.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("batchSetup.mockup.removedNotPrintify", { names: notPrintify.map((template) => template.name).join(", ") })}
        </p>
      )}
      {leftOut.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t("batchSetup.mockup.removedNoProduct", { names: leftOut.map((template) => template.name).join(", ") })}
        </p>
      )}
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>{t("batchSetup.cancel")}</Button>
        <Button type="button" disabled={pending || draftIds.length === 0 || tooMany} onClick={apply}>
          {t("batchSetup.mockup.apply")}
        </Button>
      </DialogFooter>
      <MockupTemplateFormDialog
        open={editing?.open ?? false}
        template={editing?.template ?? null}
        onClose={() => setEditing((current) => (current ? { ...current, open: false } : null))}
      />
    </>
  );
};
