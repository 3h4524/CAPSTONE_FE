"use client";

import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type WorkflowMetaFormValues, workflowMetaSchema } from "@/schemas/workflow";
import { zodResolver } from "@hookform/resolvers/zod";

type WorkflowMetaDialogProps = {
  mode: "create" | "rename";
  defaultValues: WorkflowMetaFormValues;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (values: WorkflowMetaFormValues) => void;
};

export const WorkflowMetaDialog = ({
  mode,
  defaultValues,
  isPending,
  onClose,
  onSubmit,
}: WorkflowMetaDialogProps) => {
  const { t } = useTranslation("common");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowMetaFormValues>({
    resolver: zodResolver(workflowMetaSchema),
    defaultValues,
  });

  const isCreateMode = mode === "create";

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>
            {isCreateMode
              ? t("workflowEditor.metaDialog.newTitle")
              : t("workflowEditor.metaDialog.renameTitle")}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? t("workflowEditor.metaDialog.newDescription")
              : t("workflowEditor.metaDialog.renameDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInputField
            id="workflow-name"
            label={t("workflowEditor.metaDialog.name")}
            type="text"
            placeholder={t("workflowEditor.metaDialog.namePlaceholder")}
            registration={register("name")}
            error={errors.name}
            maxLength={120}
            required
          />
          <FormTextareaField
            id="workflow-description"
            label={t("workflowEditor.metaDialog.description")}
            placeholder={t("workflowEditor.metaDialog.descriptionPlaceholder")}
            registration={register("description")}
            error={errors.description}
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              {t("workflowEditor.runGroup.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isCreateMode
                ? t("workflowEditor.workspace.createWorkflow")
                : t("workflowEditor.metaDialog.saveName")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
