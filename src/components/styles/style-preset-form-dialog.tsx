"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fromRecommendationLines, toRecommendationLines } from "@/helpers/style-preset";
import { useCreateStylePreset } from "@/hooks/mutations/use-create-style-preset";
import { useUpdateStylePreset } from "@/hooks/mutations/use-update-style-preset";
import { type StylePresetFormValues,stylePresetSchema } from "@/schemas/style-preset";
import type { StylePreset } from "@/types/style-presets";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

type StylePresetFormDialogProps = {
  open: boolean;
  preset: StylePreset | null;
  onClose: () => void;
};

export const StylePresetFormDialog = ({ open, preset, onClose }: StylePresetFormDialogProps) => {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewRemoved, setPreviewRemoved] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const { mutate: createPreset, isPending: isCreating } = useCreateStylePreset();
  const { mutate: updatePreset, isPending: isUpdating } = useUpdateStylePreset();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StylePresetFormValues>({
    resolver: zodResolver(stylePresetSchema),
    defaultValues: { name: "", description: "", styleModifiers: "", recommendationsText: "" },
  });

  useEffect(() => {
    reset({
      name: preset?.name ?? "",
      description: preset?.description ?? "",
      styleModifiers: preset?.styleModifiers ?? "",
      recommendationsText: preset ? toRecommendationLines(preset.recommendations) : "",
    });
    setPreviewFile(null);
    setPreviewRemoved(false);
    setFileError(null);
  }, [open, preset, reset]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewObjectUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  const creating = preset === null;
  const pending = isCreating || isUpdating;
  const shownPreview = previewObjectUrl ?? (previewRemoved ? null : preset?.previewImageUrl ?? null);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file for the preview.");
      return;
    }
    if (file.size > MAX_PREVIEW_BYTES) {
      setFileError("The preview image cannot exceed 5 MB.");
      return;
    }
    setFileError(null);
    setPreviewRemoved(false);
    setPreviewFile(file);
  };

  const submit = handleSubmit((values) => {
    if (creating && !previewFile) {
      setFileError("Add a preview image for the new style.");
      return;
    }
    const input = {
      name: values.name,
      description: values.description,
      styleModifiers: values.styleModifiers,
      recommendations: fromRecommendationLines(values.recommendationsText),
      preview: previewFile,
      deletePreview: previewRemoved,
    };
    if (creating) createPreset(input, { onSuccess: onClose });
    else updatePreset({ id: preset.id, ...input }, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? "New art style" : `Edit ${preset.name}`}</DialogTitle>
          <DialogDescription>Describe the style and how it shapes generated images.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-1 py-1">
              <FormInputField id="style-name" label="Name" type="text" placeholder="Neon Glow" registration={register("name")} error={errors.name} required />
              <FormTextareaField id="style-description" label="Description" placeholder="When this style shines and what it suits." registration={register("description")} error={errors.description} required rows={3} />
              <FormTextareaField id="style-modifiers" label="Prompt keywords" placeholder="Keywords appended to the image prompt." registration={register("styleModifiers")} error={errors.styleModifiers} required rows={2} />
              <FormTextareaField id="style-recommendations" label="Recommendations" placeholder="One use case per line." registration={register("recommendationsText")} error={errors.recommendationsText} rows={3} />
              <div className="space-y-2">
                <Label htmlFor="style-preview">Preview image</Label>
                {shownPreview && (
                  <div className="relative w-fit">
                    <Image src={shownPreview} alt="Style preview" width={320} height={180} unoptimized className="aspect-video w-64 rounded-lg object-cover ring-1 ring-slate-200 ring-inset" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Remove preview image"
                      className="absolute top-1 right-1 size-7"
                      onClick={() => {
                        setPreviewFile(null);
                        setPreviewRemoved(true);
                      }}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                )}
                <Input id="style-preview" type="file" accept="image/*" onChange={(event) => pickFile(event.target.files?.[0])} />
                {fileError && (
                  <p role="alert" className="text-sm text-red-600">{fileError}</p>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{creating ? "Create style" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
