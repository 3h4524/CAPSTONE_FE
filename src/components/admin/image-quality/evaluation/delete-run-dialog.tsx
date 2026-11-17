"use client";

import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteImageEvalRun } from "@/hooks/mutations/use-delete-image-eval-run";
import type { ImageEvalRunSummary } from "@/types/admin-image-quality";

type DeleteRunDialogProps = {
  open: boolean;
  run: ImageEvalRunSummary | null;
  onClose: () => void;
  onDeleted: () => void;
};

export const DeleteRunDialog = ({ open, run, onClose, onDeleted }: DeleteRunDialogProps) => {
  const { t } = useTranslation("common");
  const { mutate: deleteRun, isPending } = useDeleteImageEvalRun();

  if (!run) {
    return null;
  }

  const confirm = () =>
    deleteRun(run.id, {
      onSuccess: () => {
        onDeleted();
        onClose();
      },
    });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-rose-600 dark:text-rose-400" />
            {t("admin.imageQuality.evaluation.deleteTitle", { name: run.name })}
          </DialogTitle>
          <DialogDescription>
            {t("admin.imageQuality.evaluation.deleteDescription", { count: run.imageCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("admin.imageQuality.shared.cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={isPending}>
            {t("admin.imageQuality.shared.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
