"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ArtStyleField } from "@/components/batch-config/edit-design-prompt/art-style-field";
import { EffectivePromptPreview } from "@/components/batch-config/edit-design-prompt/effective-prompt-preview";
import { KeywordUse } from "@/components/batch-config/edit-design-prompt/keyword-use";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildEffectivePrompt, customBasePrompt } from "@/helpers/build-effective-prompt";
import { customPromptWarnings } from "@/helpers/design-text";
import { useQuickCreateStylePreset } from "@/hooks/mutations/use-quick-create-style-preset";
import { useRestoreProductPrompt } from "@/hooks/mutations/use-restore-product-prompt";
import { useSaveProductPrompt } from "@/hooks/mutations/use-save-product-prompt";
import { useBatchProductPrompt } from "@/hooks/queries/use-batch-product-prompt";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import { MAX_EFFECTIVE_PROMPT_LENGTH, type ProductPromptFormValues,productPromptSchema } from "@/schemas/product-prompt";
import { usePopupStore } from "@/stores/popup";
import type { BatchProductPrompt } from "@/types/product-prompt";
import { zodResolver } from "@hookform/resolvers/zod";

type EditDesignPromptDialogProps = {
  rowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const toFormValues = (prompt: BatchProductPrompt): ProductPromptFormValues => ({
  subject: prompt.subject,
  artStyle: prompt.artStyle,
  moodTone: prompt.moodTone,
  negativeTerms: prompt.negativeTerms,
  instructions: prompt.instructions,
  customPrompt: prompt.customPrompt ?? "",
});

export const EditDesignPromptDialog = ({ rowId, open, onOpenChange }: EditDesignPromptDialogProps) => {
  const { t } = useTranslation("common");
  const { data: prompt, isPending: isLoadingPrompt, isError: isPromptError, refetch: refetchPrompt } = useBatchProductPrompt(rowId, open);
  const { mutate: savePrompt, isPending: isSaving } = useSaveProductPrompt();
  const { mutate: restorePrompt, isPending: isRestoring } = useRestoreProductPrompt();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{t("batchConfig.title")}</DialogTitle>
          <DialogDescription>{t("batchConfig.description")}</DialogDescription>
        </DialogHeader>
        {isLoadingPrompt ? (
          <SectionLoading label={t("batchConfig.loading")} />
        ) : isPromptError || !prompt ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
            <div>
              <p className="text-ink-900 font-semibold">{t("batchConfig.unavailable")}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t("batchConfig.unavailableDescription")}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batchConfig.close")}</Button>
              <Button type="button" onClick={() => refetchPrompt()}>{t("batchConfig.tryAgain")}</Button>
            </div>
          </div>
        ) : (
          <EditDesignPromptContent
            prompt={prompt}
            pending={isSaving || isRestoring}
            onSave={(input) => savePrompt({ rowId, input }, { onSuccess: () => onOpenChange(false) })}
            onRestore={() => restorePrompt(rowId)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

type EditDesignPromptContentProps = {
  prompt: BatchProductPrompt;
  pending: boolean;
  onSave: (input: ProductPromptFormValues) => void;
  onRestore: () => void;
  onClose: () => void;
};

const EditDesignPromptContent = ({ prompt, pending, onSave, onRestore, onClose }: EditDesignPromptContentProps) => {
  const { t } = useTranslation("common");
  const openPopup = usePopupStore((state) => state.openPopup);
  const { data: stylePresets } = useStylePresets();
  const { mutate: quickCreateStyle, isPending: isCreatingStyle } = useQuickCreateStylePreset();
  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductPromptFormValues>({
    resolver: zodResolver(productPromptSchema),
    defaultValues: toFormValues(prompt),
  });

  useEffect(() => {
    reset(toFormValues(prompt));
  }, [prompt, reset]);

  const values = watch();
  const customPrompt = values.customPrompt?.trim() ?? "";
  // Removing the product's own prompt brings the template back, which the server resolves once it is saved.
  const removingCustomPrompt = !customPrompt && !!prompt.customPrompt;
  // The product's own prompt sets the look itself: the server adds no art style or style preset to it.
  const preview = buildEffectivePrompt({
    basePrompt: customPrompt ? customBasePrompt(customPrompt, values.subject ?? "") : prompt.defaultBasePrompt,
    subject: values.subject ?? "",
    artStyle: customPrompt ? "" : (values.artStyle ?? ""),
    moodTone: values.moodTone ?? "",
    negativeTerms: values.negativeTerms ?? "",
    instructions: values.instructions ?? "",
    niche: prompt.defaultNiche,
    styleModifiers: customPrompt ? "" : prompt.defaultStyleModifiers,
  });
  const overLimit = preview.length > MAX_EFFECTIVE_PROMPT_LENGTH;

  const askClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    openPopup({
      title: t("batchConfig.discardTitle"),
      description: t("batchConfig.discardDescription"),
      positiveLabel: t("batchConfig.discard"),
      onPositive: onClose,
    });
  };

  const askRestore = () => {
    openPopup({
      title: t("batchConfig.restoreTitle"),
      description: t("batchConfig.restoreDescription"),
      positiveLabel: t("batchConfig.restore"),
      onPositive: onRestore,
    });
  };

  return (
    <>
      <form
        onSubmit={handleSubmit((formValues) => onSave(formValues))}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-1 py-1">
            <FormTextareaField id="prompt-custom" label={t("batchConfig.customPrompt")} placeholder={t("batchConfig.customPromptPlaceholder")} registration={register("customPrompt")} error={errors.customPrompt} rows={3} />
            <p className="text-muted-foreground -mt-2 text-xs">{t("batchConfig.customPromptHint")}</p>
            {customPromptWarnings(values.customPrompt, values.subject).map((warning) => (
              <p key={warning} className="-mt-2 text-xs text-amber-700 dark:text-amber-300">{warning.replace("Design text", "Subject")}</p>
            ))}
            <FormInputField id="prompt-subject" label={customPrompt ? t("batchConfig.subjectWords") : t("batchConfig.subject")} type="text" placeholder={customPrompt ? t("batchConfig.noWords") : "Space cat"} registration={register("subject")} error={errors.subject} required={!customPrompt} />
            {customPrompt ? (
              <p className="text-muted-foreground text-xs">{t("batchConfig.artStyleNotApplied")}</p>
            ) : (
              <Controller
                name="artStyle"
                control={control}
                render={({ field }) => (
                  <ArtStyleField
                    value={field.value}
                    presets={stylePresets ?? []}
                    creating={isCreatingStyle}
                    disabled={pending}
                    error={errors.artStyle?.message}
                    onChange={field.onChange}
                    onCreateNew={(name) =>
                      quickCreateStyle(name, { onSuccess: (preset) => field.onChange(preset.name) })
                    }
                  />
                )}
              />
            )}
            <FormInputField id="prompt-mood" label={t("batchConfig.moodTone")} type="text" placeholder="Calm" registration={register("moodTone")} error={errors.moodTone} required={!customPrompt} />
            <FormTextareaField id="prompt-negative" label={t("batchConfig.negativeTerms")} placeholder="Blurry, dark" registration={register("negativeTerms")} error={errors.negativeTerms} rows={2} />
            <FormTextareaField id="prompt-instructions" label={t("batchConfig.instructions")} placeholder="Front print" registration={register("instructions")} error={errors.instructions} rows={2} />
            {!customPrompt && <KeywordUse motifs={prompt.motifs} ignoredKeywords={prompt.ignoredKeywords} />}
            {removingCustomPrompt
              ? <p className="text-muted-foreground text-sm">{t("batchConfig.templateUsedAgain")}</p>
              : <EffectivePromptPreview prompt={preview} />}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={askRestore} disabled={pending || !prompt.isCustomized}>{t("batchConfig.restoreDefault")}</Button>
          <Button type="button" variant="ghost" onClick={askClose} disabled={pending}>{t("batchConfig.cancel")}</Button>
          <Button type="submit" disabled={pending || overLimit}>{t("batchConfig.saveChanges")}</Button>
        </DialogFooter>
      </form>
    </>
  );
};
