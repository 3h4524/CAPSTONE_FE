"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { StylePresetImageDropzone } from "@/components/styles/style-preset-image-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMockupTemplate } from "@/hooks/mutations/use-create-mockup-template";
import { useUpdateMockupTemplate } from "@/hooks/mutations/use-update-mockup-template";
import { MOCKUP_PRODUCT_TYPES, type MockupTemplateFormValues,mockupTemplateSchema } from "@/schemas/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type MockupTemplateFormDialogProps = {
  open: boolean;
  template: MockupTemplate | null;
  onClose: () => void;
};

export const MockupTemplateFormDialog = ({ open, template, onClose }: MockupTemplateFormDialogProps) => {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [baseObjectUrl, setBaseObjectUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewRemoved, setPreviewRemoved] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { mutate: createTemplate, isPending: isCreating } = useCreateMockupTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateMockupTemplate();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MockupTemplateFormValues>({
    resolver: zodResolver(mockupTemplateSchema),
    defaultValues: { name: "", productType: "tshirt", printAreaConfig: "{}", outputWidthPx: 2000, outputHeightPx: 2000 },
  });

  useEffect(() => {
    reset({
      name: template?.name ?? "",
      productType: (template?.productType as MockupTemplateFormValues["productType"]) ?? "tshirt",
      printAreaConfig: template?.printAreaConfig ?? "{}",
      outputWidthPx: template?.outputWidthPx ?? 2000,
      outputHeightPx: template?.outputHeightPx ?? 2000,
    });
    setBaseFile(null);
    setPreviewFile(null);
    setPreviewRemoved(false);
    setFileError(null);
  }, [open, template, reset]);

  useEffect(() => {
    if (!baseFile) {
      setBaseObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(baseFile);
    setBaseObjectUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [baseFile]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewObjectUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  const creating = template === null;
  const pending = isCreating || isUpdating;
  const shownBase = baseObjectUrl ?? template?.baseImageUrl ?? null;
  const shownPreview = previewObjectUrl ?? (previewRemoved ? null : template?.previewImageUrl ?? null);

  const checkImage = (file: File) => {
    if (!file.type.startsWith("image/")) return "Choose an image file.";
    if (file.size > MAX_IMAGE_BYTES) return "Images cannot exceed 5 MB.";
    return null;
  };

  const pickBase = (file: File) => {
    const problem = checkImage(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFileError(null);
    setBaseFile(file);
  };

  const pickPreview = (file: File) => {
    const problem = checkImage(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFileError(null);
    setPreviewRemoved(false);
    setPreviewFile(file);
  };

  const submit = handleSubmit((values) => {
    if (creating && !baseFile) {
      setFileError("Add the blank mock-up image.");
      return;
    }
    const input = {
      name: values.name,
      productType: values.productType,
      printAreaConfig: values.printAreaConfig,
      outputWidthPx: values.outputWidthPx,
      outputHeightPx: values.outputHeightPx,
      baseImage: baseFile,
      preview: previewFile,
      deletePreview: previewRemoved,
    };
    if (creating) createTemplate(input, { onSuccess: onClose });
    else updateTemplate({ id: template.id, ...input }, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? "New mock-up template" : `Edit ${template.name}`}</DialogTitle>
          <DialogDescription>Describe the mock-up and upload its images.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-1 py-1">
              <FormInputField id="mockup-name" label="Name" type="text" placeholder="Classic Tee - Male Model" registration={register("name")} error={errors.name} required />
              <div className="space-y-2">
                <Label htmlFor="mockup-type">Product type</Label>
                <Controller
                  name="productType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="mockup-type" aria-invalid={Boolean(errors.productType)}>
                        <SelectValue placeholder="Product type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCKUP_PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <FormTextareaField id="mockup-print-area" label="Print area JSON" placeholder='{"x": 0, "y": 0, "width": 900, "height": 1100}' registration={register("printAreaConfig")} error={errors.printAreaConfig} required rows={3} />
              <div className="grid grid-cols-2 gap-4">
                <FormInputField id="mockup-width" label="Output width" type="number" placeholder="2000" registration={register("outputWidthPx", { valueAsNumber: true })} error={errors.outputWidthPx} required />
                <FormInputField id="mockup-height" label="Output height" type="number" placeholder="2000" registration={register("outputHeightPx", { valueAsNumber: true })} error={errors.outputHeightPx} required />
              </div>
              <StylePresetImageDropzone
                label="Blank mock-up image"
                previewUrl={shownBase}
                error={null}
                disabled={pending}
                onSelect={pickBase}
                onRemove={() => setBaseFile(null)}
              />
              <StylePresetImageDropzone
                label="Preview image (optional)"
                previewUrl={shownPreview}
                error={fileError}
                disabled={pending}
                onSelect={pickPreview}
                onRemove={() => {
                  setPreviewFile(null);
                  setPreviewRemoved(true);
                }}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{creating ? "Create template" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
