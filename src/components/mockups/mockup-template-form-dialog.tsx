"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { MockupPhotoDropzone } from "@/components/mockups/mockup-photo-dropzone";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePrintArea } from "@/helpers/mockup-template";
import { useCreateMockupTemplate } from "@/hooks/mutations/use-create-mockup-template";
import { useUpdateMockupTemplate } from "@/hooks/mutations/use-update-mockup-template";
import { productTypes } from "@/schemas/batches";
import { type MockupTemplateFormValues, mockupTemplateSchema } from "@/schemas/mockup-template";
import type { MockupPrintArea, MockupTemplate } from "@/types/mockup-templates";
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
  const { mutate: createTemplate, isPending: isCreating } = useCreateMockupTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateMockupTemplate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
    setFileError(null);
  }, [open, template, reset]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoObjectUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  const creating = template === null;
  const pending = isCreating || isUpdating;
  const shownPhoto = photoObjectUrl ?? template?.baseImageUrl ?? null;
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
    const input = { name: values.name, productType: values.productType, x: values.x, y: values.y, width: values.width, height: values.height, baseImage: photoFile };
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
                <p className="text-muted-foreground mt-0.5 text-xs">Where the design lands on the photo. Sellers can still override this per image.</p>
                {shownPhoto ? (
                  <div className="mt-2">
                    <PrintAreaEditor imageUrl={shownPhoto} value={area} onChange={setArea} disabled={pending} />
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs">Add a base photo to mark the print area.</p>
                )}
                {(errors.x || errors.y || errors.width || errors.height) && (
                  <p role="alert" className="mt-1 text-sm text-red-600">Draw a print area on the photo.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{creating ? "Create template" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
