"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { ArtStyleField } from "@/components/batch-config/edit-design-prompt/art-style-field";
import { EffectivePromptPreview } from "@/components/batch-config/edit-design-prompt/effective-prompt-preview";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildEffectivePrompt } from "@/helpers/build-effective-prompt";
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
});

export const EditDesignPromptDialog = ({ rowId, open, onOpenChange }: EditDesignPromptDialogProps) => {
  const { data: prompt, isPending: isLoadingPrompt, isError: isPromptError, refetch: refetchPrompt } = useBatchProductPrompt(rowId, open);
  const { mutate: savePrompt, isPending: isSaving } = useSaveProductPrompt();
  const { mutate: restorePrompt, isPending: isRestoring } = useRestoreProductPrompt();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Edit design prompt</DialogTitle>
          <DialogDescription>Fine-tune the AI prompt for this product before generation begins.</DialogDescription>
        </DialogHeader>
        {isLoadingPrompt ? (
          <SectionLoading label="Loading prompt" />
        ) : isPromptError || !prompt ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
            <div>
              <p className="font-semibold text-slate-900">Prompt unavailable</p>
              <p className="text-muted-foreground mt-1 text-sm">We could not load this prompt. Check your connection and try again.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="button" onClick={() => refetchPrompt()}>Try again</Button>
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
  const preview = buildEffectivePrompt({
    basePrompt: prompt.defaultBasePrompt,
    subject: values.subject ?? "",
    artStyle: values.artStyle ?? "",
    moodTone: values.moodTone ?? "",
    negativeTerms: values.negativeTerms ?? "",
    instructions: values.instructions ?? "",
    niche: prompt.defaultNiche,
    styleModifiers: prompt.defaultStyleModifiers,
  });
  const overLimit = preview.length > MAX_EFFECTIVE_PROMPT_LENGTH;

  const askClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    openPopup({
      title: "Discard changes?",
      description: "Your edits will be lost.",
      positiveLabel: "Discard",
      onPositive: onClose,
    });
  };

  const askRestore = () => {
    openPopup({
      title: "Restore default prompt?",
      description: "This clears all manual edits.",
      positiveLabel: "Restore",
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
            <FormInputField id="prompt-subject" label="Subject" type="text" placeholder="Space cat" registration={register("subject")} error={errors.subject} required />
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
            <FormInputField id="prompt-mood" label="Mood & Tone" type="text" placeholder="Calm" registration={register("moodTone")} error={errors.moodTone} required />
            <FormTextareaField id="prompt-negative" label="Negative Terms" placeholder="Blurry, dark" registration={register("negativeTerms")} error={errors.negativeTerms} rows={2} />
            <FormTextareaField id="prompt-instructions" label="Instructions" placeholder="Front print" registration={register("instructions")} error={errors.instructions} rows={2} />
            <EffectivePromptPreview prompt={preview} />
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={askRestore} disabled={pending || !prompt.isCustomized}>Restore default</Button>
          <Button type="button" variant="ghost" onClick={askClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending || overLimit}>Save changes</Button>
        </DialogFooter>
      </form>
    </>
  );
};
