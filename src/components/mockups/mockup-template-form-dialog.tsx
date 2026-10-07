"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { previewGarmentMask } from "@/api/mockup-templates";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupPhotoDropzone } from "@/components/mockups/mockup-photo-dropzone";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePrintArea } from "@/helpers/mockup-template";
import { useCreateMockupTemplate } from "@/hooks/mutations/use-create-mockup-template";
import { useUpdateMockupTemplate } from "@/hooks/mutations/use-update-mockup-template";
import { productTypes } from "@/schemas/batches";
import { type MockupTemplateFormValues, mockupTemplateSchema } from "@/schemas/mockup-template";
import type { GarmentMaskPreview, MockupPrintArea, MockupTemplate } from "@/types/mockup-templates";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const productTypeLabels: Record<string, string> = {
  tshirt: "T-shirt",
  hoodie: "Hoodie",
  mug: "Mug",
  poster: "Poster",
  tote_bag: "Tote bag",
  phone_case: "Phone case",
};

type MockupTemplateFormDialogProps = {
  open: boolean;
  template: MockupTemplate | null;
  onClose: () => void;
};

export const MockupTemplateFormDialog = ({ open, template, onClose }: MockupTemplateFormDialogProps) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [allowRecolor, setAllowRecolor] = useState(false);
  const [garmentColor, setGarmentColor] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  // The photo size the print area's numbers are currently expressed in.
  const areaBasis = useRef<{ width: number; height: number } | null>(null);
  const [maskPreview, setMaskPreview] = useState<GarmentMaskPreview | null>(null);
  const [maskPreviewPending, setMaskPreviewPending] = useState(false);
  const { mutate: createTemplate, isPending: isCreating } = useCreateMockupTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateMockupTemplate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<MockupTemplateFormValues>({
    resolver: zodResolver(mockupTemplateSchema),
    defaultValues: { name: "", productType: "tshirt", x: 0, y: 0, width: 100, height: 100 },
  });

  useEffect(() => {
    const area = template ? parsePrintArea(template.printAreaConfig) : null;
    reset({
      name: template?.name ?? "",
      productType: (template?.productType as MockupTemplateFormValues["productType"]) ?? "tshirt",
      x: area?.x ?? 0,
      y: area?.y ?? 0,
      width: area?.width ?? 100,
      height: area?.height ?? 100,
    });
    setPhotoFile(null);
    areaBasis.current = template ? { width: template.outputWidthPx, height: template.outputHeightPx } : null;
    setAllowRecolor(template?.allowRecolor ?? false);
    setGarmentColor(template?.garmentColor ?? null);
    setFileError(null);
  }, [open, template, reset]);

  useEffect(() => {
    setPhotoSize(null);
    if (!photoFile) {
      setPhotoObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoObjectUrl(objectUrl);
    let cancelled = false;
    void createImageBitmap(photoFile)
      .then((bitmap) => {
        if (!cancelled) setPhotoSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  const creating = template === null;
  const pending = isCreating || isUpdating;
  // A photo without a saved garment mask (newly picked, or not analyzed yet) is analyzed on the
  // server right away: the mask gives the garment box to center the print area in, and lets the
  // recolor be previewed before saving. This is a quick pass; saving runs the full one.
  const savedMaskUrl = !photoFile ? (template?.garmentMaskUrl ?? null) : null;
  const savedPhotoUrl = template?.baseImageUrl ?? null;
  const needsPreview = open && (photoFile !== null || savedPhotoUrl !== null) && !savedMaskUrl;

  useEffect(() => {
    setMaskPreview(null);
    if (!needsPreview) {
      setMaskPreviewPending(false);
      return;
    }
    const controller = new AbortController();
    setMaskPreviewPending(true);
    void (async () => {
      try {
        let photo = photoFile;
        if (!photo) {
          const blob = await (await fetch(savedPhotoUrl as string, { signal: controller.signal })).blob();
          photo = new File([blob], "base-photo", { type: blob.type });
        }
        const preview = await previewGarmentMask(photo, controller.signal);
        if (!controller.signal.aborted) setMaskPreview(preview);
      } catch {
        // No preview is not an error here: saving still analyzes the photo and reports problems.
      } finally {
        if (!controller.signal.aborted) setMaskPreviewPending(false);
      }
    })();
    return () => controller.abort();
  }, [needsPreview, photoFile, savedPhotoUrl]);

  const shownPhoto = photoObjectUrl ?? savedPhotoUrl;
  const shownPhotoSize = photoFile ? photoSize : template ? { width: template.outputWidthPx, height: template.outputHeightPx } : null;
  const shownWidth = shownPhotoSize?.width ?? 0;
  const shownHeight = shownPhotoSize?.height ?? 0;

  // A photo of another size keeps the print area on the same part of the picture; the first photo
  // of a new template gets a centered box to start from.
  useEffect(() => {
    if (!shownWidth || !shownHeight) return;
    const basis = areaBasis.current;
    areaBasis.current = { width: shownWidth, height: shownHeight };
    if (basis && basis.width === shownWidth && basis.height === shownHeight) return;

    let next: MockupPrintArea;
    if (basis) {
      const kx = shownWidth / basis.width;
      const ky = shownHeight / basis.height;
      const current = getValues();
      const width = Math.max(1, Math.min(shownWidth, Math.round(current.width * kx)));
      const height = Math.max(1, Math.min(shownHeight, Math.round(current.height * ky)));
      next = {
        x: Math.max(0, Math.min(shownWidth - width, Math.round(current.x * kx))),
        y: Math.max(0, Math.min(shownHeight - height, Math.round(current.y * ky))),
        width,
        height,
      };
    } else {
      const side = Math.round(Math.min(shownWidth, shownHeight) * 0.35);
      next = { x: Math.round((shownWidth - side) / 2), y: Math.round((shownHeight - side) / 2), width: side, height: side };
    }
    setValue("x", next.x, { shouldValidate: true });
    setValue("y", next.y, { shouldValidate: true });
    setValue("width", next.width, { shouldValidate: true });
    setValue("height", next.height, { shouldValidate: true });
  }, [shownWidth, shownHeight, getValues, setValue]);

  // A newly picked photo has no saved mask; its preview's mask stands in until it is saved.
  const maskUrl = maskPreview?.maskDataUrl ?? savedMaskUrl;
  const recolorProblem = maskPreview && !maskPreview.recolorable ? maskPreview.reason : null;
  const tint = allowRecolor && garmentColor && maskUrl ? { color: garmentColor, maskUrl } : undefined;
  const area: MockupPrintArea = { x: watch("x"), y: watch("y"), width: watch("width"), height: watch("height") };
  const setArea = (next: MockupPrintArea) => {
    setValue("x", next.x, { shouldValidate: true });
    setValue("y", next.y, { shouldValidate: true });
    setValue("width", next.width, { shouldValidate: true });
    setValue("height", next.height, { shouldValidate: true });
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file for the base photo.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("The base photo cannot exceed 10 MB.");
      return;
    }
    setFileError(null);
    setPhotoFile(file);
  };

  const submit = handleSubmit((values) => {
    if (creating && !photoFile) {
      setFileError("Add a base photo for the new template.");
      return;
    }
    const input = { name: values.name, productType: values.productType, x: values.x, y: values.y, width: values.width, height: values.height, baseImage: photoFile, allowRecolor, garmentColor: allowRecolor ? garmentColor : null };
    if (creating) createTemplate(input, { onSuccess: onClose });
    else updateTemplate({ id: template.id, ...input }, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? "New mock-up template" : `Edit ${template.name}`}</DialogTitle>
          <DialogDescription>Upload a real product photo and mark where the design should be placed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-1 py-1">
              <FormInputField id="mockup-name" label="Name" type="text" placeholder="Classic tee, front" registration={register("name")} error={errors.name} required />
              <div className="space-y-2">
                <Label htmlFor="mockup-product-type">Product type *</Label>
                <Select value={watch("productType")} onValueChange={(value) => value && setValue("productType", value as MockupTemplateFormValues["productType"], { shouldValidate: true })}>
                  <SelectTrigger id="mockup-product-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MockupPhotoDropzone previewUrl={shownPhoto} error={fileError} disabled={pending} onSelect={pickFile} onRemove={() => setPhotoFile(null)} />
              <div>
                <p className="text-sm font-medium text-slate-900">Print area</p>
                <p className="text-muted-foreground mt-0.5 text-xs">Where the design lands on the photo. Sellers can still override this per image.
                  {maskPreviewPending && " Finding the garment in the photo… this takes a few seconds."}
                </p>
                {shownPhoto ? (
                  <div className="mt-2">
                    <PrintAreaEditor
                      key={`${shownPhoto}:${shownPhotoSize?.width ?? 0}x${shownPhotoSize?.height ?? 0}`}
                      imageUrl={shownPhoto}
                      value={area}
                      onChange={setArea}
                      disabled={pending}
                      garmentTint={tint}
                      pixelSize={shownPhotoSize ?? undefined}
                      garmentMaskUrl={maskUrl ?? undefined}
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">Add a base photo to mark the print area.</p>
                )}
                {(errors.x || errors.y || errors.width || errors.height) && (
                  <p role="alert" className="mt-1 text-sm text-red-600">Draw a print area on the photo.</p>
                )}
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox id="mockup-allow-recolor" checked={allowRecolor} onCheckedChange={(checked) => setAllowRecolor(checked === true)} disabled={pending} className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="mockup-allow-recolor">Allow garment recolor</Label>
                  <p className="text-muted-foreground text-xs">
                    Lets sellers pick any garment color for this template. Needs a white or light-gray garment on a plain background.
                  </p>
                </div>
              </div>
              {allowRecolor && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Garment color</p>
                    <p className="text-muted-foreground text-xs">
                      Mock-ups from this template use this color, unless a batch picks its own colors. None keeps the photo’s color.
                    </p>
                    {recolorProblem && (
                      <p role="alert" className="mt-1 text-sm text-red-600">
                        This photo can’t be recolored: {recolorProblem} Use a white or light-gray garment on a plain background.
                      </p>
                    )}
                  </div>
                  <GarmentColorPicker
                    selected={garmentColor ? [garmentColor] : []}
                    disabled={pending}
                    onToggle={(hex) => setGarmentColor((current) => (current?.toLowerCase() === hex.toLowerCase() ? null : hex))}
                  />
                </div>
              )}
              {template && !template.realisticPrintReady && !photoFile && (
                <p className="text-muted-foreground text-xs">Saving also prepares realistic printing (fabric folds and shadows) for this photo.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Analyzing photo…" : creating ? "Create template" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
