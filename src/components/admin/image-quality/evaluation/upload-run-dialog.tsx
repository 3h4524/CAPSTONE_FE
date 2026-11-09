"use client";

import { Upload } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

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
            Upload scoring results
          </DialogTitle>
          <DialogDescription>
            Choose the file the export step of the offline scoring scripts wrote. Thumbnails inside
            it are stored with the run, so the page never needs the scoring machine again.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-eval-name">Name</Label>
            <Input
              id="image-eval-name"
              placeholder="e.g. Keyword rules · 30/10"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FormErrorText id="image-eval-name-error" message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-eval-notes">Notes</Label>
            <Textarea
              id="image-eval-notes"
              rows={2}
              placeholder="What changed in the prompt, which images were scored"
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
                <Label htmlFor="image-eval-file">Export file (.json, up to 10 MB)</Label>
                <Input
                  id="image-eval-file"
                  type="file"
                  accept=".json,application/json"
                  aria-invalid={Boolean(errors.file)}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.files?.[0])}
                />
                <FormErrorText id="image-eval-file-error" message={errors.file?.message} />
              </div>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
