"use client";

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

export function GlobalPopup() {
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
            {negativeLabel}
          </Button>
          <Button onClick={handlePositive}>{positiveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
