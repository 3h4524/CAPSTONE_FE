"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AssistantDeleteAllDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const AssistantDeleteAllDialog = ({ open, onOpenChange, onConfirm }: AssistantDeleteAllDialogProps) => {
  const { t } = useTranslation("common");
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{t("commons.assistant.deleteAll.title")}</DialogTitle>
        <DialogDescription>
          {t("commons.assistant.deleteAll.description")}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t("commons.popup.cancel")}
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          {t("commons.assistant.deleteAll.confirm")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};
