"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GarmentColorPicker, GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { MockupBackgroundPicker, MockupBackgroundSwatch } from "@/components/mockups/mockup-background-picker";
import { MockupKindBadge } from "@/components/mockups/mockup-kind-badge";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { garmentColorName, MAX_GARMENT_COLORS } from "@/helpers/garment-colors";
import { backgroundKeys, backgroundsFor, resolveBackground } from "@/helpers/mockup-backgrounds";
import { mockupViewLabel, parsePrintifyFrame, samePlacement, templatePlacementOf } from "@/helpers/mockup-template";
import type { MockupTemplate, MockupTemplatePlacement } from "@/types/mockup-templates";

/** What the form keeps for a template in this workflow. */
export type MockupPlacementChoice = {
  /** Where the design goes, or null for the template's own position. */
  placement: MockupTemplatePlacement | null;
  colors: string[];
  /** The background of each garment color. */
  backgrounds: Record<string, string>;
  shownColor: string | null;
};

type MockupPlacementDialogProps = {
  template: MockupTemplate;
  /** The position this workflow has for the template; null while it uses the template's own. */
  placement: MockupTemplatePlacement | null;
  /** The garment colors the form starts from. */
  colors: string[];
  /** The garment color the template is shown in. */
  shownColor?: string;
  /** The backgrounds picked for the template so far, by garment color. */
  backgrounds?: Record<string, string>;
  /** A generated design shown in the print area while it is moved. */
  designUrl?: string | null;
  onSave: (choice: MockupPlacementChoice) => void;
  onClose: () => void;
};

const sameColor = (left: string | null | undefined, right: string | null | undefined) =>
  (left ?? "").toLowerCase() === (right ?? "").toLowerCase();

// Sets up a template for this workflow alone, laid out like the form that edits a finished mock-up: the photo with its
// print area on one side, the garment colors and backgrounds on the other. A system template is shared, so it is never
// changed here, and nothing is kept until the form is saved.
export const MockupPlacementDialog = ({
  template,
  placement,
  colors: startColors,
  shownColor: startShownColor,
  backgrounds: startBackgrounds,
  designUrl,
  onSave,
  onClose,
}: MockupPlacementDialogProps) => {
  const { t } = useTranslation("common");
  const own = templatePlacementOf(template);
  const [draft, setDraft] = useState<MockupTemplatePlacement | null>(placement ?? own);
  const [colors, setColors] = useState(startColors);
  const [shownColor, setShownColor] = useState<string | null>(startShownColor ?? null);
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>(startBackgrounds ?? {});
  // On a Printify template the design stays inside what Printify can print.
  const frame = template.printify ? (parsePrintifyFrame(template.printAreaConfig) ?? undefined) : undefined;
  const moved = Boolean(draft && own && !samePlacement(draft, own));
  const palette = template.printify?.colors;
  const previewColor = template.allowRecolor ? (colors.find((hex) => sameColor(hex, shownColor)) ?? colors[0] ?? null) : null;
  const shownKey = backgroundKeys(previewColor ? [previewColor] : [])[0];
  const shownBackground = template.allowBackground ? resolveBackground(backgrounds, shownKey) : null;

  const toggleColor = (hex: string) => {
    const has = colors.some((item) => sameColor(item, hex));
    setColors((current) => (has ? current.filter((item) => !sameColor(item, hex)) : [...current, hex]));
    // A color just ticked is the one shown.
    if (!has) setShownColor(hex);
  };

  // The other colors are written out first, so changing one never changes what the rest were showing.
  const chooseBackground = (hex: string | null) =>
    setBackgrounds((current) => {
      const { [shownKey]: _replaced, ...others } = backgroundsFor(current, backgroundKeys(colors));
      return hex ? { ...others, [shownKey]: hex } : others;
    });

  const save = () =>
    onSave({
      placement: moved ? draft : null,
      colors,
      backgrounds: template.allowBackground ? backgroundsFor(backgrounds, backgroundKeys(colors)) : {},
      shownColor: previewColor,
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(88dvh,780px)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>{t("batchSetup.mockup.placementTitle", { name: template.name })}</DialogTitle>
          <DialogDescription>{t("batchSetup.mockup.placementDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
          <section
            aria-label={t("batchJobs.editMockup.sidePhoto", { side: mockupViewLabel("front") })}
            className="bg-ink-50 flex flex-col gap-3 px-4 py-4 md:min-h-0 md:overflow-y-auto"
          >
            <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
              <p className="text-ink-900 text-sm font-semibold">{mockupViewLabel("front")}</p>
              {moved && (
                <Button type="button" variant="outline" size="sm" className="bg-card h-8 gap-1.5 px-2.5 text-xs" onClick={() => setDraft(own)}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {t("batchJobs.editMockup.templatePosition")}
                </Button>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center">
              {draft && (
                <div className="my-auto max-w-full">
                  <PrintAreaEditor
                    imageUrl={template.baseImageUrl}
                    imageClassName="max-h-[max(10rem,calc(min(88dvh,780px)-19rem))]"
                    overlayImageUrl={designUrl ?? undefined}
                    garmentMaskUrl={template.garmentMaskUrl ?? undefined}
                    garmentTint={previewColor && template.garmentMaskUrl ? { color: previewColor, maskUrl: template.garmentMaskUrl } : undefined}
                    background={shownBackground}
                    value={draft}
                    onChange={(next) => setDraft((current) => (current ? { ...current, ...next } : current))}
                    rotation={draft.rotation}
                    onRotationChange={(rotation) => setDraft((current) => (current ? { ...current, rotation } : current))}
                    frame={frame}
                  />
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 border-t px-5 py-4 md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t("batchJobs.editMockup.template")}</p>
                <MockupKindBadge template={template} />
              </div>
              <p className="text-muted-foreground text-sm">{template.name}</p>
              {template.views && template.views.length > 0 && (
                <p className="text-muted-foreground text-xs">{t("batchSetup.mockup.placementFrontOnly")}</p>
              )}
            </div>

            {template.allowRecolor && (
              <div className="space-y-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("batchJobs.mockups.garmentColors")}</p>
                  <p className="text-muted-foreground text-xs">{t("batchJobs.editMockup.colorsHint")}</p>
                </div>
                <GarmentColorPicker selected={colors} max={MAX_GARMENT_COLORS} onToggle={toggleColor} palette={palette} allowCustom={!template.printify} />
                {colors.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{t("batchJobs.editMockup.shownIn")}</span>
                    {colors.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-pressed={sameColor(hex, previewColor)}
                        aria-label={t("batchJobs.mockups.showIn", { name: garmentColorName(hex, palette) })}
                        title={garmentColorName(hex, palette)}
                        onClick={() => setShownColor(hex)}
                        className={
                          sameColor(hex, previewColor)
                            ? "border-ink-300 ring-primary size-5 rounded-full border ring-2 ring-offset-1"
                            : "border-ink-300 hover:border-ink-500 size-5 rounded-full border"
                        }
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {template.allowBackground && (
              <div className="space-y-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("batchJobs.editMockup.background")}</p>
                  {colors.length > 1 && <p className="text-muted-foreground text-xs">{t("batchJobs.editMockup.backgroundPerColor")}</p>}
                </div>
                {colors.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("batchJobs.editMockup.backgroundColorGroup")}>
                    {colors.map((hex) => {
                      const shown = sameColor(hex, previewColor);
                      const chosen = resolveBackground(backgrounds, backgroundKeys([hex])[0]);
                      return (
                        <button
                          key={hex}
                          type="button"
                          aria-label={t("batchJobs.editMockup.backgroundFor", { name: garmentColorName(hex, palette) })}
                          aria-pressed={shown}
                          onClick={() => setShownColor(hex)}
                          className={shown ? "ring-primary flex items-center gap-1 rounded-full p-0.5 ring-2" : "flex items-center gap-1 rounded-full p-0.5"}
                        >
                          <GarmentColorSwatch hex={hex} className="size-5" />
                          {/* The background chosen for this garment color, so all of them can be seen at a glance. */}
                          {chosen && <MockupBackgroundSwatch hex={chosen} className="mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {colors.length > 1 && previewColor && (
                  <p className="text-ink-700 flex items-center gap-1.5 text-xs">
                    <GarmentColorSwatch hex={previewColor} />
                    {t("batchJobs.editMockup.garment", { name: garmentColorName(previewColor, palette) })}
                  </p>
                )}
                {/* Keyed by the garment color, so a color typed for one is not left in the field for the next. */}
                <MockupBackgroundPicker key={shownKey} value={shownBackground} onChange={chooseBackground} />
              </div>
            )}
          </aside>
        </div>

        <DialogFooter className="flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>{t("batchSetup.cancel")}</Button>
          <Button type="button" disabled={!draft} onClick={save}>{t("batchJobs.editMockup.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
