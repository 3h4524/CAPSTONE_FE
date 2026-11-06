"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AdminFeature } from "@/types/feature-catalog";

type FeatureChooserDialogProps = {
  open: boolean;
  title: string;
  description: string;
  // The features that can be picked, in catalog order.
  candidates: AdminFeature[];
  isPending?: boolean;
  onAdd: (codes: string[]) => void;
  onClose: () => void;
};

// Picks features from the catalog: search, grouped, several at once, each marked with the plans
// that already have it. Used to add features to a plan and to a plan being created.
export function FeatureChooserDialog({ open, title, description, candidates, isPending = false, onAdd, onClose }: FeatureChooserDialogProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const close = () => {
    setQuery("");
    setPicked([]);
    onClose();
  };

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return candidates.filter((feature) => !term || `${feature.label} ${feature.description} ${feature.group}`.toLowerCase().includes(term));
  }, [candidates, query]);
  const groups = [...new Set(shown.map((feature) => feature.group))];

  const toggle = (code: string) =>
    setPicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  const submit = () => {
    if (picked.length === 0) return;
    onAdd(picked);
    setQuery("");
    setPicked([]);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6">
          <div className="text-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fc]">
            <Plus className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">ADD FEATURES</p>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">{title}</DialogTitle>
            <DialogDescription className="leading-5">{description}</DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 size-10 rounded-lg text-slate-500 hover:translate-y-0 hover:bg-slate-100"
            onClick={close}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <div className="px-5 pb-2 sm:px-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search features"
              aria-label="Search features"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6">
          {shown.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {query ? "No feature matches your search." : "Every feature on offer is already included."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{group}</p>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {shown
                    .filter((feature) => feature.group === group)
                    .map((feature) => (
                      <li key={feature.code}>
                        <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                          <Checkbox
                            className="mt-0.5"
                            checked={picked.includes(feature.code)}
                            onCheckedChange={() => toggle(feature.code)}
                            aria-label={feature.label}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-800">{feature.label}</span>
                            {feature.description && <span className="block text-xs text-slate-500">{feature.description}</span>}
                          </span>
                          {feature.plans.length > 0 && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              In {feature.plans.join(", ")}
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={picked.length === 0 || isPending}>
            {isPending && <Spinner className="size-4" />}
            {picked.length > 1 ? `Add ${picked.length} features` : "Add feature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
