"use client";

import { Upload } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FileDropzone } from "@/components/commons/forms/file-dropzone";
import { FormErrorText } from "@/components/commons/forms/form-error-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readImageEvalFile } from "@/helpers/image-eval-file";
import { useCreateImageEvalRun } from "@/hooks/mutations/use-create-image-eval-run";
import { imageEvalUploadFormSchema,type ImageEvalUploadFormValues } from "@/schemas/image-eval";
import { zodResolver } from "@hookform/resolvers/zod";

type UploadRunDialogProps = {
  open: boolean;
  onClose: () => void;
  onUploaded: (id: string) => void;
};

const EMPTY_VALUES = { name: "", notes: "" };

export const UploadRunDialog = ({ open, onClose, onUploaded }: UploadRunDialogProps) => {
  const { t } = useTranslation("common");
  const { mutate: createRun, isPending } = useCreateImageEvalRun();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ImageEvalUploadFormValues>({
    resolver: zodResolver(imageEvalUploadFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const handleClose = () => {
    reset(EMPTY_VALUES);
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    const result = await readImageEvalFile(values.file);
    if (!result.isValid) {
      setError("file", { message: result.message });
      return;
    }
    createRun(
      { ...result.content, name: values.name, notes: values.notes || null },
      {
        onSuccess: (run) => {
          onUploaded(run.id);
          handleClose();
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="text-ink-500 size-5" />
            {t("admin.imageQuality.evaluation.uploadTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.imageQuality.evaluation.uploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-eval-name">{t("admin.imageQuality.evaluation.nameLabel")}</Label>
            <Input
              id="image-eval-name"
              placeholder={t("admin.imageQuality.evaluation.namePlaceholder")}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FormErrorText id="image-eval-name-error" message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-eval-notes">{t("admin.imageQuality.evaluation.notesLabel")}</Label>
            <Textarea
              id="image-eval-notes"
              rows={2}
              placeholder={t("admin.imageQuality.evaluation.notesPlaceholder")}
              aria-invalid={Boolean(errors.notes)}
              {...register("notes")}
            />
            <FormErrorText id="image-eval-notes-error" message={errors.notes?.message} />
          </div>
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <FileDropzone
                  label={t("admin.imageQuality.evaluation.exportFileLabel")}
                  accept=".json,application/json"
                  fileName={field.value?.name}
                  invalid={Boolean(errors.file)}
                  onBlur={field.onBlur}
                  onSelect={field.onChange}
                />
                <FormErrorText id="image-eval-file-error" message={errors.file?.message} />
              </div>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("admin.imageQuality.shared.cancel")}
            </Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              {t("admin.imageQuality.shared.upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
