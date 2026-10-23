"use client";

import React from "react";
import { FlaskConical, RefreshCw, ShieldCheck } from "lucide-react";

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
}: TestReportRunDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FlaskConical className="size-5 text-slate-500" />
          Run the end-to-end suite
        </DialogTitle>
        <DialogDescription>
          The backend seeds a verified seller, resets its own test data, then runs the Playwright
          suite. Nothing has to be typed in here.
        </DialogDescription>
      </DialogHeader>

      <ul className="space-y-3 text-sm text-slate-600">
        <li className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            The seller{" "}
            <span className="font-mono text-xs text-slate-800">e2e.seller@apcs.test</span> is
            registered and confirmed before every run, so the suite never needs a manual sign-in.
          </span>
        </li>
        <li className="flex gap-3">
          <RefreshCw className="mt-0.5 size-4 shrink-0 text-slate-500" />
          <span>
            Every run starts from a clean reset of the test data, while the report history stays in
            the store — this dialog only asks the backend to append one more run there.
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
          Cancel
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Starting…" : "Run the suite"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
