"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDuplicatePlan } from "@/hooks/mutations/use-plan-tools";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";

const TIER = /^[a-z0-9-]+$/;

// Starts a new plan from a copy of another: same prices, limits and features, a new name and tier.
export function DuplicatePlanDialog({ plan, onClose }: { plan: AdminSubscriptionPlan | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState("");
  const mutation = useDuplicatePlan(onClose);

  useEffect(() => {
    if (!plan) return;
    setName(`${plan.name} copy`);
    setTier(`${plan.tier}-copy`);
  }, [plan]);

  const nameError = name.trim().length === 0 ? "Enter a plan name." : null;
  const tierError = TIER.test(tier.trim()) ? null : "Use lowercase letters, digits and dashes, with no spaces.";

  return (
    <Dialog open={plan !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-20px)] max-w-[460px] gap-0 rounded-[24px] border-0 bg-card p-0">
        <DialogHeader className="flex-row items-start gap-3 px-6 pt-6 pb-3 text-left">
          <div className="text-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100">
            <Copy className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">Duplicate {plan?.name}</DialogTitle>
            <DialogDescription>
              Same prices, limits and features. The copy is not on sale until you check it and put it on sale.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-3">
          <div className="space-y-1.5">
            <label htmlFor="duplicate-name" className="text-sm font-medium text-ink-700">
              New plan name
            </label>
            <Input id="duplicate-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={nameError !== null} />
            {nameError && <p className="text-destructive text-xs">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="duplicate-tier" className="text-sm font-medium text-ink-700">
              Tier slug
            </label>
            <Input id="duplicate-tier" value={tier} onChange={(event) => setTier(event.target.value)} aria-invalid={tierError !== null} />
            {tierError ? (
              <p className="text-destructive text-xs">{tierError}</p>
            ) : (
              <p className="text-[11px] text-ink-400">Cannot be changed later.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!plan || nameError !== null || tierError !== null || mutation.isPending}
            onClick={() => plan && mutation.mutate({ planId: plan.id, name: name.trim(), tier: tier.trim() })}
          >
            {mutation.isPending && <Spinner className="size-4" />}
            Create copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
