"use client";

import { useState } from "react";
import { Bug, Eye, EyeOff, FlaskConical, RefreshCw, ShieldCheck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TestReportRunMode } from "@/types/admin-test-reports";

type TestReportRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (mode: TestReportRunMode) => void;
};

export const TestReportRunDialog = ({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: TestReportRunDialogProps) => {
  const { t } = useTranslation("common");
  const [mode, setMode] = useState<TestReportRunMode>("headless");

  const handleConfirm = () => {
    onConfirm(mode);
  };

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

        <div className="space-y-3 py-1">
          <Label className="text-ink-700 text-xs font-semibold tracking-wider uppercase">
            {t("admin.testReports.runDialog.modeLabel")}
          </Label>
          <RadioGroup
            value={mode}
            onValueChange={(val) => setMode(val as TestReportRunMode)}
            className="grid gap-2.5"
            disabled={isPending}
          >
            <label
              htmlFor="mode-headless"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === "headless"
                  ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                  : "border-ink-200 hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="headless" id="mode-headless" className="mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <EyeOff className="text-ink-500 size-4" />
                  <span className="text-ink-900 text-sm font-medium">
                    {t("admin.testReports.runDialog.modeHeadlessTitle")}
                  </span>
                </div>
                <p className="text-ink-500 text-xs">
                  {t("admin.testReports.runDialog.modeHeadlessDescription")}
                </p>
              </div>
            </label>

            <label
              htmlFor="mode-headed"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === "headed"
                  ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                  : "border-ink-200 hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="headed" id="mode-headed" className="mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Eye className="text-ink-500 size-4" />
                  <span className="text-ink-900 text-sm font-medium">
                    {t("admin.testReports.runDialog.modeHeadedTitle")}
                  </span>
                </div>
                <p className="text-ink-500 text-xs">
                  {t("admin.testReports.runDialog.modeHeadedDescription")}
                </p>
              </div>
            </label>

            <label
              htmlFor="mode-debug"
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                mode === "debug"
                  ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                  : "border-ink-200 hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="debug" id="mode-debug" className="mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bug className="text-ink-500 size-4" />
                  <span className="text-ink-900 text-sm font-medium">
                    {t("admin.testReports.runDialog.modeDebugTitle")}
                  </span>
                </div>
                <p className="text-ink-500 text-xs">
                  {t("admin.testReports.runDialog.modeDebugDescription")}
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <ul className="text-ink-600 space-y-2 border-t pt-3 text-xs">
          <li className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              {t("admin.testReports.runDialog.sellerNote", { email: "e2e.seller@apcs.test" })}
            </span>
          </li>
          <li className="flex gap-2.5">
            <RefreshCw className="text-ink-500 mt-0.5 size-3.5 shrink-0" />
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
          <Button type="button" onClick={handleConfirm} disabled={isPending}>
            {t("admin.testReports.runDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
