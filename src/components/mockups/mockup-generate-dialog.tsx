"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { parsePrintArea, productTypeLabel } from "@/helpers/mockup-template";
import { useGenerateMockupImage } from "@/hooks/mutations/use-generate-mockup-image";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import type { MockupImage, MockupPrintArea } from "@/types/mockup-templates";

type MockupGenerateDialogProps = {
  open: boolean;
  designImageId: string | null;
  designImageUrl: string | null;
  productName: string;
  productType: string;
  onOpenChange: (open: boolean) => void;
};

export const MockupGenerateDialog = ({ open, designImageId, designImageUrl, productName, productType, onOpenChange }: MockupGenerateDialogProps) => {
  // Only templates for this product's own type: any other pick is rejected by the backend.
  const { data: templates, isPending: isLoadingTemplates } = useMockupTemplates(productType || undefined, open);
  const { mutate: generate, isPending: isGenerating } = useGenerateMockupImage();

  const [templateId, setTemplateId] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [position, setPosition] = useState<MockupPrintArea>({ x: 0, y: 0, width: 100, height: 100 });
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
    setPosition(parsePrintArea(selectedTemplate.printAreaConfig) ?? { x: 0, y: 0, width: 100, height: 100 });
    setGarmentColor(selectedTemplate.garmentColor);
  }, [selectedTemplate]);

  const close = () => onOpenChange(false);

  const submit = () => {
    if (!designImageId || !templateId) return;
    generate(
      { designImageId, input: { mockupTemplateId: templateId, ...(advanced ? position : {}), ...(garmentColor ? { garmentColor } : {}) } },
      { onSuccess: setResult }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Preview on a mock-up</DialogTitle>
          <DialogDescription>
            Composite this design for “{productName}”{productType ? ` (${productTypeLabel(productType)})` : ""} onto a product photo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {isLoadingTemplates ? (
          <SectionLoading label="Loading mock-up templates" />
        ) : !templates || templates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No {productType ? productTypeLabel(productType) : ""} mock-up templates yet. Upload one from the Mock-up Templates page first.
          </p>
        ) : result ? (
          <div className="space-y-3">
            <Image
              src={result.mockupImageUrl}
              alt="Design composited on the mock-up"
              width={result.mockupWidthPx}
              height={result.mockupHeightPx}
              unoptimized
              className="bg-muted w-full rounded-lg border object-cover"
            />
            <a href={result.mockupImageUrl} target="_blank" rel="noreferrer" className="text-primary text-sm underline underline-offset-4">
              Open full size
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mockup-generate-template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="mockup-generate-template" className="w-full">
                  <SelectValue placeholder="Choose a mock-up template" />
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
                <p className="text-sm font-medium">Customize position</p>
                <p className="text-muted-foreground text-xs">Off uses the template’s default print area.</p>
              </div>
              <Switch checked={advanced} onCheckedChange={setAdvanced} disabled={!selectedTemplate} />
            </div>

            {selectedTemplate?.allowRecolor && selectedTemplate.garmentMaskUrl && (
              <div className="space-y-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Garment color</p>
                  <p className="text-muted-foreground text-xs">None keeps the photo’s own color.</p>
                </div>
                <GarmentColorPicker
                  selected={garmentColor ? [garmentColor] : []}
                  onToggle={(hex) => setGarmentColor((current) => (current?.toLowerCase() === hex.toLowerCase() ? null : hex))}
                />
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-3">
                <PrintAreaEditor
                  imageUrl={selectedTemplate.baseImageUrl}
                  overlayImageUrl={designImageUrl ?? undefined}
                  garmentMaskUrl={selectedTemplate.garmentMaskUrl ?? undefined}
                  garmentTint={garmentColor && selectedTemplate.garmentMaskUrl ? { color: garmentColor, maskUrl: selectedTemplate.garmentMaskUrl } : undefined}
                  value={position}
                  onChange={setPosition}
                  disabled={!advanced}
                />
                {selectedTemplate.realisticPrintReady && (
                  <p className="text-muted-foreground text-xs">The result also follows the fabric’s folds and shadows.</p>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={close}>{result ? "Close" : "Cancel"}</Button>
          {!result && (
            <Button type="button" disabled={!templateId || isGenerating} onClick={submit}>
              {isGenerating ? "Generating…" : "Generate"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
