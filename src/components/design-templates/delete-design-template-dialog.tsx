"use client";

import { AlertTriangle, X } from "lucide-react";
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
import type { DesignTemplateSummary } from "@/types/design-template";

type DeleteDesignTemplateDialogProps = {
  template: DesignTemplateSummary | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

export function DeleteDesignTemplateDialog({
  template,
  deleting,
  onClose,
  onConfirm,
}: DeleteDesignTemplateDialogProps) {
  const { t } = useTranslation("common");
  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="border-ink-200 rounded-2xl sm:max-w-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-ink-500 hover:bg-ink-100 absolute top-3 right-3 size-11 rounded-lg hover:translate-y-0"
          onClick={onClose}
          disabled={deleting}
          aria-label={t("designTemplates.closeDeleteDialog")}
        >
          <X aria-hidden="true" />
        </Button>
        <DialogHeader className="pr-12">
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>{t("designTemplates.deleteTitle")}</DialogTitle>
          <DialogDescription className="leading-6">
            {t("designTemplates.deleteDescription", { name: template?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
            {t("designTemplates.keepTemplate")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!template || deleting}
            onClick={() => template && onConfirm(template.id)}
          >
            {deleting ? t("designTemplates.deleting") : t("designTemplates.deleteTemplate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
