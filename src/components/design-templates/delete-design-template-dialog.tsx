"use client";

import { AlertTriangle, X } from "lucide-react";

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
  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="rounded-2xl border-slate-200 sm:max-w-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 size-11 rounded-lg text-slate-500 hover:translate-y-0 hover:bg-slate-100"
          onClick={onClose}
          disabled={deleting}
          aria-label="Close delete template dialog"
        >
          <X aria-hidden="true" />
        </Button>
        <DialogHeader className="pr-12">
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>Delete personal template?</DialogTitle>
          <DialogDescription className="leading-6">
            {template?.name} will disappear from your library. Historical jobs keep their prompt snapshot.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
            Keep template
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!template || deleting}
            onClick={() => template && onConfirm(template.id)}
          >
            {deleting ? "Deleting..." : "Delete template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
