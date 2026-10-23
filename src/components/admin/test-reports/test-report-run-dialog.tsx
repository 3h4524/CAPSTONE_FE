"use client";

import React from "react";
import { FlaskConical, ShieldCheck, Trash2 } from "lucide-react";

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
          The suite needs a signed-in seller, so the backend prepares one for the length of the
          run. Nothing has to be typed in here.
        </DialogDescription>
      </DialogHeader>

      <ul className="space-y-3 text-sm text-slate-600">
        <li className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>
            The seller{" "}
            <span className="font-mono text-xs text-slate-800">e2e.seller@apcs.test</span> is
            created and confirmed before the run and gets a fresh random password. The password
            lives only while the run lasts — it is never stored and never written to the report.
          </span>
        </li>
        <li className="flex gap-3">
          <Trash2 className="mt-0.5 size-4 shrink-0 text-slate-500" />
          <span>
            When the run is over the account is removed together with everything the suite left on
            it, so the next run starts from the same clean state.
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
