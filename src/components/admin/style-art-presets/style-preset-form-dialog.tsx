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
import { Switch } from "@/components/ui/switch";
import { fromRecommendationLines, toRecommendationLines } from "@/helpers/style-preset";
import { useCreateAdminStyleArtPreset } from "@/hooks/mutations/use-create-admin-style-art-preset";
import { useUpdateAdminStyleArtPreset } from "@/hooks/mutations/use-update-admin-style-art-preset";
import { type AdminStyleArtPresetFormValues,adminStyleArtPresetSchema } from "@/schemas/admin-style-art-preset";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;

type StylePresetFormDialogProps = {
  open: boolean;
  preset: AdminStyleArtPreset | null;
  onClose: () => void;
};

export const StylePresetFormDialog = ({ open, preset, onClose }: StylePresetFormDialogProps) => {
  const { t } = useTranslation("common");
  const creating = preset === null;
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewRemoved, setPreviewRemoved] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const { mutate: createPreset, isPending: isCreating } = useCreateAdminStyleArtPreset();
  const { mutate: updatePreset, isPending: isUpdating } = useUpdateAdminStyleArtPreset();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdminStyleArtPresetFormValues>({
    resolver: zodResolver(adminStyleArtPresetSchema),
    defaultValues: {
      name: "",
      description: "",
      styleModifiers: "",
      recommendationsText: "",
    },
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
    setIsActive(preset?.isActive ?? true);
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

  const pending = isCreating || isUpdating;
  const shownPreview = previewObjectUrl ?? (previewRemoved ? null : preset?.previewImageUrl ?? null);
  const isActiveDirty = !creating && isActive !== preset?.isActive;
  const canRetryTranslation = !creating && preset?.viStatus === "failed";

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError(t("admin.styles.form.fileNotImage"));
      return;
    }
    if (file.size > MAX_PREVIEW_BYTES) {
      setFileError(t("admin.styles.form.fileTooLarge"));
      return;
    }
    setFileError(null);
    setPreviewRemoved(false);
    setPreviewFile(file);
  };

  const submit = handleSubmit((formValues) => {
    const input = {
      name: formValues.name,
      description: formValues.description,
      styleModifiers: formValues.styleModifiers,
      recommendations: fromRecommendationLines(formValues.recommendationsText),
      preview: previewFile,
      deletePreview: previewRemoved,
      isActive: creating ? true : isActive,
    };
    if (creating) createPreset(input, { onSuccess: onClose });
    else updatePreset({ id: preset.id, ...input }, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? t("admin.styles.form.titleNew") : t("admin.styles.form.titleEdit", { name: preset.name })}</DialogTitle>
          <DialogDescription>{t("admin.styles.form.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-1 py-1">
              <FormInputField id="preset-name" label={t("admin.styles.form.nameLabel")} type="text" placeholder={t("admin.styles.form.namePlaceholder")} registration={register("name")} error={errors.name} required />
              <FormTextareaField id="preset-description" label={t("admin.styles.form.descriptionLabel")} placeholder={t("admin.styles.form.descriptionPlaceholder")} registration={register("description")} error={errors.description} rows={4} required />
              <FormTextareaField id="preset-recommendations" label={t("admin.styles.form.recommendationsLabel")} placeholder={t("admin.styles.form.recommendationsPlaceholder")} registration={register("recommendationsText")} error={errors.recommendationsText} rows={3} />

              <FormTextareaField id="preset-style-modifiers" label={t("admin.styles.form.styleModifiersLabel")} placeholder={t("admin.styles.form.styleModifiersPlaceholder")} registration={register("styleModifiers")} error={errors.styleModifiers} rows={2} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
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
                {!creating && (
                  <label className="border-ink-200 flex items-center gap-3 rounded-md border px-3 py-2">
                    <span className="text-ink-800 text-sm font-medium">{t("admin.styles.form.activeLabel")}</span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} disabled={pending} aria-label={t("admin.styles.form.activeAriaLabel")} />
                  </label>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{t("admin.styles.form.cancel")}</Button>
            <Button type="submit" disabled={(!isDirty && !isActiveDirty && !canRetryTranslation) || pending}>{creating ? t("admin.styles.form.createSubmit") : t("admin.styles.form.saveSubmit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
