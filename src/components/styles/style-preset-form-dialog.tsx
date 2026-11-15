"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { StylePresetImageDropzone } from "@/components/styles/style-preset-image-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const { t } = useTranslation("common");
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
      setFileError(t("styles.fileNotImage"));
      return;
    }
    if (file.size > MAX_PREVIEW_BYTES) {
      setFileError(t("styles.fileTooLarge"));
      return;
    }
    setFileError(null);
    setPreviewRemoved(false);
    setPreviewFile(file);
  };

  const submit = handleSubmit((values) => {
    if (creating && !previewFile) {
      setFileError(t("styles.previewRequired"));
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
          <DialogTitle>{creating ? t("styles.dialogTitleCreate") : t("styles.dialogTitleEdit", { name: preset.name })}</DialogTitle>
          <DialogDescription>{t("styles.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-1 py-1">
              <FormInputField id="style-name" label={t("styles.name")} type="text" placeholder={t("styles.namePlaceholder")} registration={register("name")} error={errors.name} required />
              <FormTextareaField id="style-description" label={t("styles.description")} placeholder={t("styles.descriptionPlaceholder")} registration={register("description")} error={errors.description} required rows={3} />
              <FormTextareaField id="style-modifiers" label={t("styles.promptKeywords")} placeholder={t("styles.promptKeywordsPlaceholder")} registration={register("styleModifiers")} error={errors.styleModifiers} required rows={2} />
              <FormTextareaField id="style-recommendations" label={t("styles.recommendations")} placeholder={t("styles.recommendationsPlaceholder")} registration={register("recommendationsText")} error={errors.recommendationsText} rows={3} />
              <StylePresetImageDropzone
                previewUrl={shownPreview}
                error={fileError}
                disabled={pending}
                onSelect={pickFile}
                onRemove={() => {
                  setPreviewFile(null);
                  setPreviewRemoved(true);
                }}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{t("styles.cancel")}</Button>
            <Button type="submit" disabled={pending}>{creating ? t("styles.createStyle") : t("styles.saveChanges")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
