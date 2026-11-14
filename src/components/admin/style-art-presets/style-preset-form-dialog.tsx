"use client";

import { useEffect, useRef, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { translateTexts } from "@/api/translations";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { StylePresetImageDropzone } from "@/components/styles/style-preset-image-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/helpers/error-message";
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

const hasContent = (...fields: string[]) => fields.some((field) => field.trim().length > 0);

export const StylePresetFormDialog = ({ open, preset, onClose }: StylePresetFormDialogProps) => {
  const creating = preset === null;
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewRemoved, setPreviewRemoved] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [translating, setTranslating] = useState(false);
  const lastEdited = useRef<"en" | "vi">("en");
  const { mutate: createPreset, isPending: isCreating } = useCreateAdminStyleArtPreset();
  const { mutate: updatePreset, isPending: isUpdating } = useUpdateAdminStyleArtPreset();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<AdminStyleArtPresetFormValues>({
    resolver: zodResolver(adminStyleArtPresetSchema),
    defaultValues: {
      name: "",
      description: "",
      styleModifiers: "",
      recommendationsText: "",
      viName: "",
      viDescription: "",
      viRecommendationsText: "",
    },
  });

  useEffect(() => {
    reset({
      name: preset?.name ?? "",
      description: preset?.description ?? "",
      styleModifiers: preset?.styleModifiers ?? "",
      recommendationsText: preset ? toRecommendationLines(preset.recommendations) : "",
      viName: preset?.vi?.name ?? "",
      viDescription: preset?.vi?.description ?? "",
      viRecommendationsText: preset?.vi ? toRecommendationLines(preset.vi.recommendations) : "",
    });
    setPreviewFile(null);
    setPreviewRemoved(false);
    setFileError(null);
    setIsActive(preset?.isActive ?? true);
    lastEdited.current = "en";
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

  const translate = async () => {
    const values = getValues();
    const enHas = hasContent(values.name, values.description, values.recommendationsText);
    const viHas = hasContent(values.viName, values.viDescription, values.viRecommendationsText);
    const from = enHas && !viHas ? "en" : viHas && !enHas ? "vi" : lastEdited.current;
    const to = from === "en" ? "vi" : "en";

    const source = from === "en"
      ? { name: values.name.trim(), description: values.description.trim(), recommendations: fromRecommendationLines(values.recommendationsText) }
      : { name: values.viName.trim(), description: values.viDescription.trim(), recommendations: fromRecommendationLines(values.viRecommendationsText) };
    const snapshot = {
      name: values.name,
      description: values.description,
      recommendationsText: values.recommendationsText,
      viName: values.viName,
      viDescription: values.viDescription,
      viRecommendationsText: values.viRecommendationsText,
    };

    setTranslating(true);
    try {
      const items = [
        { key: "name", text: source.name },
        { key: "description", text: source.description },
        ...source.recommendations.map((text, index) => ({ key: `recommendations/${index}`, text })),
      ].filter((item) => item.text.length > 0);

      const translated = await translateTexts({ items, sourceLocale: from, targetLocale: to });
      const byKey = new Map(translated.map((item) => [item.key, item.text]));
      const recommendations = source.recommendations.map((_, index) => byKey.get(`recommendations/${index}`) ?? "");
      const lines = toRecommendationLines(recommendations);

      if (to === "vi") {
        setValue("viName", byKey.get("name") ?? source.name, { shouldDirty: true });
        setValue("viDescription", byKey.get("description") ?? source.description, { shouldDirty: true });
        setValue("viRecommendationsText", lines, { shouldDirty: true });
      } else {
        setValue("name", byKey.get("name") ?? source.name, { shouldDirty: true });
        setValue("description", byKey.get("description") ?? source.description, { shouldDirty: true });
        setValue("recommendationsText", lines, { shouldDirty: true });
      }

      toast.success(to === "vi" ? "Vietnamese fields filled." : "English fields filled.", {
        action: {
          label: "Undo",
          onClick: () => {
            if (to === "vi") {
              setValue("viName", snapshot.viName, { shouldDirty: true });
              setValue("viDescription", snapshot.viDescription, { shouldDirty: true });
              setValue("viRecommendationsText", snapshot.viRecommendationsText, { shouldDirty: true });
            } else {
              setValue("name", snapshot.name, { shouldDirty: true });
              setValue("description", snapshot.description, { shouldDirty: true });
              setValue("recommendationsText", snapshot.recommendationsText, { shouldDirty: true });
            }
          },
        },
      });
    } catch (error) {
      toast.error(`Translation failed: ${getErrorMessage(error)}`);
    } finally {
      setTranslating(false);
    }
  };

  const watchedValues = useWatch({ control });
  const canTranslate = !translating && hasContent(
    watchedValues.name ?? "",
    watchedValues.description ?? "",
    watchedValues.recommendationsText ?? "",
    watchedValues.viName ?? "",
    watchedValues.viDescription ?? "",
    watchedValues.viRecommendationsText ?? ""
  );

  const submit = handleSubmit((formValues) => {
    const recommendations = fromRecommendationLines(formValues.recommendationsText);
    const viDirty = Boolean(dirtyFields.viName || dirtyFields.viDescription || dirtyFields.viRecommendationsText);
    const vi = viDirty
      ? {
          name: formValues.viName.trim(),
          description: formValues.viDescription.trim(),
          recommendations: fromRecommendationLines(formValues.viRecommendationsText),
        }
      : null;
    const input = {
      name: formValues.name,
      description: formValues.description,
      styleModifiers: formValues.styleModifiers,
      recommendations,
      preview: previewFile,
      deletePreview: previewRemoved,
      isActive: creating ? true : isActive,
      vi,
    };
    if (creating) createPreset(input, { onSuccess: onClose });
    else updatePreset({ id: preset.id, ...input }, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? "New system style" : `Edit ${preset.name}`}</DialogTitle>
          <DialogDescription>System styles ship to every seller. English is required; the Vietnamese translation can be filled by hand or generated with one click.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-1 py-1">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                <fieldset className="border-ink-200 space-y-3 rounded-md border p-3">
                  <legend className="text-ink-700 px-1 text-xs font-semibold tracking-wide">EN · English</legend>
                  <FormInputField id="preset-en-name" label="Name" type="text" placeholder="Neon Glow" registration={register("name", { onChange: () => (lastEdited.current = "en") })} error={errors.name} required />
                  <FormTextareaField id="preset-en-description" label="Description" placeholder="When this style shines and what it suits." registration={register("description", { onChange: () => (lastEdited.current = "en") })} error={errors.description} rows={4} required />
                  <FormTextareaField id="preset-en-recommendations" label="Recommendations" placeholder="One use case per line." registration={register("recommendationsText", { onChange: () => (lastEdited.current = "en") })} error={errors.recommendationsText} rows={3} />
                </fieldset>

                <div className="flex items-center justify-center md:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={translate}
                    disabled={!canTranslate || pending}
                    aria-label="Translate between English and Vietnamese"
                    title="Translate between English and Vietnamese"
                  >
                    {translating ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
                  </Button>
                </div>

                <fieldset className="border-ink-200 space-y-3 rounded-md border p-3">
                  <legend className="text-ink-700 px-1 text-xs font-semibold tracking-wide">VI · Tiếng Việt</legend>
                  <FormInputField id="preset-vi-name" label="Name" type="text" placeholder="Tên kiểu ảnh" registration={register("viName", { onChange: () => (lastEdited.current = "vi") })} error={errors.viName} />
                  <FormTextareaField id="preset-vi-description" label="Description" placeholder="Khi nào nên dùng kiểu này." registration={register("viDescription", { onChange: () => (lastEdited.current = "vi") })} error={errors.viDescription} rows={4} />
                  <FormTextareaField id="preset-vi-recommendations" label="Recommendations" placeholder="Mỗi dòng một trường hợp dùng." registration={register("viRecommendationsText", { onChange: () => (lastEdited.current = "vi") })} error={errors.viRecommendationsText} rows={3} />
                </fieldset>
              </div>

              <FormTextareaField id="preset-style-modifiers" label="Prompt keywords — shared, never translated" placeholder="target FLAT, studio lighting, neon glow" registration={register("styleModifiers")} error={errors.styleModifiers} rows={2} />

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
                    <span className="text-ink-800 text-sm font-medium">Active</span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} disabled={pending} aria-label="Toggle active state" />
                  </label>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={(!isDirty && !isActiveDirty) || pending}>{creating ? "Create style" : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
