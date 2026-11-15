"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { PrintAreaList } from "@/components/mockups/print-area-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { areaLabel, MAIN_AREA_KEY, parsePrintLayout, withViewTemplates } from "@/helpers/mockup-template";
import { useGenerateMockupImage } from "@/hooks/mutations/use-generate-mockup-image";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { productTypes } from "@/schemas/batches";
import type { MockupArea, MockupImage } from "@/types/mockup-templates";

type MockupGenerateDialogProps = {
  open: boolean;
  designImageId: string | null;
  designImageUrl: string | null;
  productName: string;
  productType: string;
  onOpenChange: (open: boolean) => void;
};

export const MockupGenerateDialog = ({ open, designImageId, designImageUrl, productName, productType, onOpenChange }: MockupGenerateDialogProps) => {
  const { t } = useTranslation("common");
  const localizedProductType = (value: string) =>
    (productTypes as readonly string[]).includes(value) ? t(`mockups.productTypes.${value}`) : value;
  // Only templates for this product's own type: any other pick is rejected by the backend.
  const { data: listed, isPending: isLoadingTemplates } = useMockupTemplates(productType || undefined, open);
  // Each template with the photos of its other sides (back, sleeves).
  const templates = listed ? withViewTemplates(listed) : undefined;
  const { mutate: generate, isPending: isGenerating } = useGenerateMockupImage();

  const [templateId, setTemplateId] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [areas, setAreas] = useState<MockupArea[]>([]);
  const [activeKey, setActiveKey] = useState(MAIN_AREA_KEY);
  const [result, setResult] = useState<MockupImage | null>(null);
  const [garmentColor, setGarmentColor] = useState<string | null>(null);

  const selectedTemplate = templates?.find((template) => template.id === templateId) ?? null;

  useEffect(() => {
    if (!open) return;
    setTemplateId("");
    setAdvanced(false);
    setResult(null);
  }, [open, designImageId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setAreas(
      parsePrintLayout(selectedTemplate.printAreaConfig)?.areas ?? [
        { key: MAIN_AREA_KEY, name: null, x: 0, y: 0, width: 100, height: 100, rotation: 0, source: "same" },
      ]
    );
    setActiveKey(MAIN_AREA_KEY);
    setGarmentColor(selectedTemplate.garmentColor);
  }, [selectedTemplate]);

  const close = () => onOpenChange(false);
  const activeIndex = Math.max(0, areas.findIndex((area) => area.key === activeKey));
  const active = areas[activeIndex];
  const updateActive = (patch: Partial<MockupArea>) => setAreas(areas.map((area) => (area.key === active.key ? { ...area, ...patch } : area)));
  const printsNothing = areas.length > 0 && areas.every((area) => area.source !== "same");

  const submit = () => {
    if (!designImageId || !templateId) return;
    const [main] = areas;
    // One straight area printing the design is sent as a plain position, as before there were several areas.
    const placement = !advanced
      ? {}
      : areas.length === 1 && main.rotation === 0 && main.source === "same"
        ? { x: main.x, y: main.y, width: main.width, height: main.height }
        : { areas };
    generate(
      { designImageId, input: { mockupTemplateId: templateId, ...placement, ...(garmentColor ? { garmentColor } : {}) } },
      { onSuccess: setResult }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{t("mockups.generateDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("mockups.generateDialog.description", { productName, typeSuffix: productType ? t("mockups.generateDialog.typeSuffix", { productType: localizedProductType(productType) }) : "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {isLoadingTemplates ? (
          <SectionLoading label={t("mockups.generateDialog.loadingTemplates")} />
        ) : !templates || templates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("mockups.generateDialog.noTemplatesNote", { productType: productType ? localizedProductType(productType) : "" })}
          </p>
        ) : result ? (
          <div className="space-y-3">
            <Image
              src={result.mockupImageUrl}
              alt={t("mockups.generateDialog.compositedAlt")}
              width={result.mockupWidthPx}
              height={result.mockupHeightPx}
              unoptimized
              className="bg-muted w-full rounded-lg border object-cover"
            />
            <a href={result.mockupImageUrl} target="_blank" rel="noreferrer" className="text-primary text-sm underline underline-offset-4">
              {t("mockups.generateDialog.openFullSize")}
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mockup-generate-template">{t("mockups.generateDialog.templateAria")}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="mockup-generate-template" className="w-full">
                  <SelectValue placeholder={t("mockups.generateDialog.templatePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t("mockups.generateDialog.customizePosition")}</p>
                <p className="text-muted-foreground text-xs">{t("mockups.generateDialog.customizePositionNote")}</p>
              </div>
              <Switch checked={advanced} onCheckedChange={setAdvanced} disabled={!selectedTemplate} />
            </div>

            {selectedTemplate?.allowRecolor && selectedTemplate.garmentMaskUrl && (
              <div className="space-y-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("mockups.generateDialog.garmentColorSection")}</p>
                  <p className="text-muted-foreground text-xs">{t("mockups.generateDialog.garmentColorNote")}</p>
                </div>
                <GarmentColorPicker
                  selected={garmentColor ? [garmentColor] : []}
                  onToggle={(hex) => setGarmentColor((current) => (current?.toLowerCase() === hex.toLowerCase() ? null : hex))}
                />
              </div>
            )}

            {selectedTemplate && active && (
              <div className="space-y-3">
                <PrintAreaEditor
                  imageUrl={selectedTemplate.baseImageUrl}
                  overlayImageUrl={active.source === "same" ? (designImageUrl ?? undefined) : undefined}
                  garmentMaskUrl={selectedTemplate.garmentMaskUrl ?? undefined}
                  garmentTint={garmentColor && selectedTemplate.garmentMaskUrl ? { color: garmentColor, maskUrl: selectedTemplate.garmentMaskUrl } : undefined}
                  value={active}
                  onChange={(next) => updateActive({ x: next.x, y: next.y, width: next.width, height: next.height })}
                  rotation={active.rotation}
                  onRotationChange={(rotation) => updateActive({ rotation })}
                  label={areaLabel(active, activeIndex)}
                  otherAreas={areas
                    .map((area, index) => ({
                      key: area.key,
                      label: areaLabel(area, index),
                      area,
                      rotation: area.rotation,
                      overlayImageUrl: area.source === "same" ? (designImageUrl ?? undefined) : undefined,
                    }))
                    .filter((area) => area.key !== active.key)}
                  onSelectArea={setActiveKey}
                  disabled={!advanced}
                />
                {advanced && (
                  <PrintAreaList
                    mode="mockup"
                    areas={areas}
                    activeKey={active.key}
                    onSelect={setActiveKey}
                    onChange={setAreas}
                  />
                )}
                {selectedTemplate.realisticPrintReady && (
                  <p className="text-muted-foreground text-xs">{t("mockups.generateDialog.realisticPrintNote")}</p>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={close}>{result ? t("mockups.generateDialog.close") : t("mockups.cancel")}</Button>
          {!result && (
            <Button type="button" disabled={!templateId || isGenerating || (advanced && printsNothing)} onClick={submit}>
              {isGenerating ? t("mockups.generateDialog.generating") : t("mockups.generateDialog.generate")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
