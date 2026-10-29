"use client";

import { useEffect, useState } from "react";

import { resetMockupOverride, saveMockupOverride, saveMockupOverrides } from "@/api/mockup-templates";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupBackgroundPicker } from "@/components/mockups/mockup-background-picker";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { garmentColorName } from "@/helpers/garment-colors";
import { findDuplicateMockup, isMockupChangeScope, type MockupChangeScope, mockupsInScope, samePrintArea, spreadMockupChange } from "@/helpers/mockup-overrides";
import { parsePrintArea, productTypeLabel } from "@/helpers/mockup-template";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import type { GenerateAllMockupsResult, MockupImage, MockupOverride, MockupPrintArea } from "@/types/mockup-templates";

type MockupImageEditDialogProps = {
  batchJobId: string;
  /** The mock-up being changed; the dialog is open while there is one. */
  image: MockupImage | null;
  /** All of the job's mock-ups: the background and design position can be copied onto those of the same template, and none may end up the same as another. */
  images: MockupImage[];
  productName: string;
  productType: string;
  /** The design on the mock-up, shown in the print area while it is moved. */
  designImageUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** The job's mock-ups, made again with the change, and how many mock-ups it changed. */
  onSaved: (result: GenerateAllMockupsResult, changedCount: number) => void;
};

// Changes one mock-up of a batch job apart from the job's settings: its template, garment color, background and where
// the design sits. The background and the design position can be copied onto the job's other mock-ups of the same
// template in the same save. A change that would make two mock-ups alike is not saved. The job keeps the changes, so
// making the job's mock-ups again does not undo them.
export const MockupImageEditDialog = ({ batchJobId, image, images, productName, productType, designImageUrl, onOpenChange, onSaved }: MockupImageEditDialogProps) => {
  const open = image !== null;
  // Only templates for this product's own type: any other is refused.
  const { data: templates, isPending: isLoadingTemplates } = useMockupTemplates(productType || undefined, open);
  // Every template, to know which of the other mock-ups' templates can take a background.
  const { data: allTemplates } = useMockupTemplates(undefined, open);
  const [templateId, setTemplateId] = useState("");
  const [garmentColor, setGarmentColor] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  // Where the design was moved to, for the template it was moved on; otherwise the template's own print area is used.
  const [moved, setMoved] = useState<{ templateId: string; area: MockupPrintArea } | null>(null);
  const [scope, setScope] = useState<MockupChangeScope>("this");

  const template = templates?.find((item) => item.id === templateId) ?? null;
  const templateArea = template ? parsePrintArea(template.printAreaConfig) : null;
  const area = moved?.templateId === templateId ? moved.area : templateArea;
  const change: MockupOverride = {
    mockupTemplateId: templateId,
    garmentColor,
    backgroundColor: background,
    // Left where the template puts it, the design follows the template's print area.
    printArea: area && !samePrintArea(area, templateArea) ? area : null,
  };
  const templatesById = new Map((allTemplates ?? []).map((item) => [item.id, item]));
  const othersOnTemplate = image ? mockupsInScope(images, image, templateId, "template").length : 0;
  const spread = image ? spreadMockupChange(change, mockupsInScope(images, image, templateId, scope), templatesById) : [];
  // A second picture of the same thing is not made: the seller picks another color, or removes this one instead.
  const duplicate = image && templateId ? findDuplicateMockup(images, image, change, spread, templatesById) : null;
  const duplicateName = duplicate
    ? [templatesById.get(duplicate.setup.mockupTemplateId)?.name ?? "the same template", duplicate.setup.garmentColor ? garmentColorName(duplicate.setup.garmentColor) : null]
        .filter(Boolean)
        .join(" in ")
    : "";

  // Starts from how the mock-up is made now, changing it alone.
  useEffect(() => {
    if (!image) return;
    const current = image.override && !image.override.removed ? image.override : null;
    setTemplateId(current?.mockupTemplateId ?? image.mockupTemplateId);
    setGarmentColor(current ? current.garmentColor : image.garmentColor);
    setBackground(current ? current.backgroundColor : (image.backgroundColor ?? null));
    setMoved(current?.printArea ? { templateId: current.mockupTemplateId, area: current.printArea } : null);
    setScope("this");
  }, [image]);

  const save = useMutation<GenerateAllMockupsResult, { removed: boolean }>({
    mutationFn: ({ removed }) => {
      const own = { slotKey: image?.slotKey ?? "", replacedMockupImageId: image?.id ?? null, override: { ...change, removed } };
      // Removing a mock-up, or a copy that reaches no other one, is a change to this mock-up alone.
      return removed || spread.length === 0 ? saveMockupOverride(batchJobId, own) : saveMockupOverrides(batchJobId, [own, ...spread]);
    },
    onSuccess: (result, { removed }) => onSaved(result, removed ? 1 : spread.length + 1),
  });
  const reset = useMutation<GenerateAllMockupsResult, void>({
    mutationFn: () => resetMockupOverride(batchJobId, image?.slotKey ?? "", image?.id ?? null),
    onSuccess: (result) => onSaved(result, 1),
  });
  const busy = save.isPending || reset.isPending;

  const chooseTemplate = (id: string) => {
    const next = templates?.find((item) => item.id === id);
    setTemplateId(id);
    // What the new template can't do is dropped.
    if (!next?.allowRecolor || !next.garmentMaskUrl) setGarmentColor(null);
    if (!next?.allowBackground) setBackground(null);
  };

  const scopes: { value: MockupChangeScope; label: string; count?: number }[] = [
    { value: "this", label: "This mock-up only" },
    { value: "template", label: "Mock-ups on this template", count: othersOnTemplate },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(false)}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Edit this mock-up</DialogTitle>
          <DialogDescription>
            Changes this mock-up of “{productName}”, and can copy its background and design position to the other mock-ups on its template. The
            job keeps the changes when its mock-ups are made again.
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
                    {!samePrintArea(area, templateArea) && (
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
                  <p className="text-muted-foreground text-xs">Drag or resize the box to move the design.</p>
                </div>
              )}

              {template && othersOnTemplate > 0 && (
                <div className="space-y-2.5 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Apply to</p>
                    <p className="text-muted-foreground text-xs">Copies the background and the design position. Each mock-up keeps its own garment color.</p>
                  </div>
                  <RadioGroup value={scope} onValueChange={(next) => isMockupChangeScope(next) && setScope(next)} disabled={busy} className="gap-2">
                    {scopes.map((item) => (
                      <label key={item.value} htmlFor={`mockup-edit-scope-${item.value}`} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <RadioGroupItem id={`mockup-edit-scope-${item.value}`} value={item.value} disabled={item.count === 0} />
                        <span className={item.count === 0 ? "text-muted-foreground" : undefined}>
                          {item.label}
                          {item.count !== undefined && <span className="text-muted-foreground"> · {item.count} more</span>}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  {scope !== "this" && (
                    <p className="text-muted-foreground text-xs" aria-live="polite">
                      {spread.length === 0
                        ? "The other mock-ups already look like this, so only this one is saved."
                        : `${spread.length} other mock-up${spread.length === 1 ? "" : "s"} will change.`}
                    </p>
                  )}
                </div>
              )}

              {duplicate && (
                <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  This would look exactly like another mock-up of this design ({duplicateName}). Choose another garment color, or remove this
                  mock-up instead.
                </p>
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
          <Button type="button" disabled={busy || !template || !area || !image?.slotKey || duplicate !== null} onClick={() => save.mutate({ removed: false })}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
