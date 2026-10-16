"use client";

import { useEffect, useState } from "react";

import { resetMockupOverride, saveMockupOverride } from "@/api/mockup-templates";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupBackgroundPicker } from "@/components/mockups/mockup-background-picker";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePrintArea, productTypeLabel } from "@/helpers/mockup-template";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import type { GenerateAllMockupsResult, MockupImage, MockupPrintArea } from "@/types/mockup-templates";

type MockupImageEditDialogProps = {
  batchJobId: string;
  /** The mock-up being changed; the dialog is open while there is one. */
  image: MockupImage | null;
  productName: string;
  productType: string;
  /** The design on the mock-up, shown in the print area while it is moved. */
  designImageUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** The job's mock-ups, made again with the change. */
  onSaved: (result: GenerateAllMockupsResult) => void;
};

const samePlace = (left: MockupPrintArea | null, right: MockupPrintArea | null) =>
  left !== null && right !== null && left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;

// Changes one mock-up of a batch job apart from the job's settings: its template, garment color, background and where
// the design sits. The job keeps the change, so making the job's mock-ups again does not undo it.
export const MockupImageEditDialog = ({ batchJobId, image, productName, productType, designImageUrl, onOpenChange, onSaved }: MockupImageEditDialogProps) => {
  const open = image !== null;
  // Only templates for this product's own type: any other is refused.
  const { data: templates, isPending: isLoadingTemplates } = useMockupTemplates(productType || undefined, open);
  const [templateId, setTemplateId] = useState("");
  const [garmentColor, setGarmentColor] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  // Where the design was moved to, for the template it was moved on; otherwise the template's own print area is used.
  const [moved, setMoved] = useState<{ templateId: string; area: MockupPrintArea } | null>(null);

  const template = templates?.find((item) => item.id === templateId) ?? null;
  const templateArea = template ? parsePrintArea(template.printAreaConfig) : null;
  const area = moved?.templateId === templateId ? moved.area : templateArea;

  // Starts from how the mock-up is made now.
  useEffect(() => {
    if (!image) return;
    const current = image.override && !image.override.removed ? image.override : null;
    setTemplateId(current?.mockupTemplateId ?? image.mockupTemplateId);
    setGarmentColor(current ? current.garmentColor : image.garmentColor);
    setBackground(current ? current.backgroundColor : (image.backgroundColor ?? null));
    setMoved(current?.printArea ? { templateId: current.mockupTemplateId, area: current.printArea } : null);
  }, [image]);

  const save = useMutation<GenerateAllMockupsResult, { removed: boolean }>({
    mutationFn: ({ removed }) =>
      saveMockupOverride(batchJobId, {
        slotKey: image?.slotKey ?? "",
        replacedMockupImageId: image?.id ?? null,
        override: {
          mockupTemplateId: templateId,
          garmentColor,
          backgroundColor: background,
          // Left where the template puts it, the design follows the template's print area.
          printArea: area && !samePlace(area, templateArea) ? area : null,
          removed,
        },
      }),
    onSuccess: onSaved,
  });
  const reset = useMutation<GenerateAllMockupsResult, void>({
    mutationFn: () => resetMockupOverride(batchJobId, image?.slotKey ?? "", image?.id ?? null),
    onSuccess: onSaved,
  });
  const busy = save.isPending || reset.isPending;

  const chooseTemplate = (id: string) => {
    const next = templates?.find((item) => item.id === id);
    setTemplateId(id);
    // What the new template can't do is dropped.
    if (!next?.allowRecolor || !next.garmentMaskUrl) setGarmentColor(null);
    if (!next?.allowBackground) setBackground(null);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(false)}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Edit this mock-up</DialogTitle>
          <DialogDescription>
            Only this mock-up of “{productName}” changes. It keeps the change when the job’s mock-ups are made again.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
          {isLoadingTemplates ? (
            <SectionLoading label="Loading mock-up templates" />
          ) : !templates || templates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No {productType ? productTypeLabel(productType) : ""} mock-up templates. Add one on the Mock-up Templates page first.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="mockup-edit-template">Template</Label>
                <Select value={templateId} onValueChange={chooseTemplate} disabled={busy}>
                  <SelectTrigger id="mockup-edit-template" className="w-full">
                    <SelectValue placeholder="Choose a mock-up template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {template?.allowRecolor && template.garmentMaskUrl && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Garment color</p>
                    <p className="text-muted-foreground text-xs">None keeps the photo’s own color.</p>
                  </div>
                  <GarmentColorPicker
                    selected={garmentColor ? [garmentColor] : []}
                    disabled={busy}
                    onToggle={(hex) => setGarmentColor((current) => (current?.toLowerCase() === hex.toLowerCase() ? null : hex))}
                  />
                </div>
              )}

              {template?.allowBackground && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Background</p>
                  <MockupBackgroundPicker value={background} disabled={busy} onChange={setBackground} />
                </div>
              )}

              {template && area && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Design position</p>
                    {!samePlace(area, templateArea) && (
                      <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" disabled={busy} onClick={() => setMoved(null)}>
                        Use the template’s print area
                      </Button>
                    )}
                  </div>
                  <PrintAreaEditor
                    imageUrl={template.baseImageUrl}
                    overlayImageUrl={designImageUrl ?? undefined}
                    garmentMaskUrl={template.garmentMaskUrl ?? undefined}
                    garmentTint={garmentColor && template.garmentMaskUrl ? { color: garmentColor, maskUrl: template.garmentMaskUrl } : undefined}
                    background={template.allowBackground ? background : null}
                    value={area}
                    onChange={(next) => setMoved({ templateId, area: next })}
                    disabled={busy}
                  />
                  <p className="text-muted-foreground text-xs">Drag or resize the box to move the design on this mock-up only.</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 pt-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          {image?.override && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => reset.mutate()}>
              {reset.isPending ? "Resetting…" : "Use the job’s settings"}
            </Button>
          )}
          <Button type="button" variant="outline" className="text-destructive" disabled={busy || !image?.slotKey} onClick={() => save.mutate({ removed: true })}>
            Remove this mock-up
          </Button>
          <Button type="button" disabled={busy || !template || !area || !image?.slotKey} onClick={() => save.mutate({ removed: false })}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
