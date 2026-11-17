"use client";

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
import { usePopupStore } from "@/stores/popup";

const DEFAULT_LABEL_KEYS: Record<string, string> = {
  Confirm: "commons.popup.confirm",
  Cancel: "commons.popup.cancel",
};

export function GlobalPopup() {
  const { t } = useTranslation("common");
  const buttonLabel = (label: string) => (DEFAULT_LABEL_KEYS[label] ? t(DEFAULT_LABEL_KEYS[label]) : label);
  const {
    isOpen,
    title,
    description,
    positiveLabel,
    negativeLabel,
    showCloseButton,
    onPositive,
    onNegative,
    closePopup,
  } = usePopupStore();

  const handlePositive = () => {
    onPositive?.();
    closePopup();
  };

  const handleNegative = () => {
    onNegative?.();
    closePopup();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleNegative();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleNegative}>
            {buttonLabel(negativeLabel)}
          </Button>
          <Button onClick={handlePositive}>{buttonLabel(positiveLabel)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
