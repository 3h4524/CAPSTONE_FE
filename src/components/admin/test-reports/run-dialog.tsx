"use client";

import { FlaskConical, RefreshCw, ShieldCheck } from "lucide-react";
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

type TestReportRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
};

export const TestReportRunDialog = ({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: TestReportRunDialogProps) => {
  const { t } = useTranslation("common");

  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FlaskConical className="text-ink-500 size-5" />
          {t("admin.testReports.runDialog.title")}
        </DialogTitle>
        <DialogDescription>
          {t("admin.testReports.runDialog.description")}
        </DialogDescription>
      </DialogHeader>

      <ul className="text-ink-600 space-y-3 text-sm">
        <li className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {t("admin.testReports.runDialog.sellerNote", { email: "e2e.seller@apcs.test" })}
          </span>
        </li>
        <li className="flex gap-3">
          <RefreshCw className="text-ink-500 mt-0.5 size-4 shrink-0" />
          <span>
            {t("admin.testReports.runDialog.cleanNote")}
          </span>
        </li>
      </ul>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          {t("admin.testReports.runDialog.cancel")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isPending}>
          {t("admin.testReports.runDialog.confirm")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};
