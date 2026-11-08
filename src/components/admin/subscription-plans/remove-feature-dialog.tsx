"use client";

import { MinusCircle } from "lucide-react";

import { FeatureImpactNote } from "@/components/admin/subscription-plans/feature-impact-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useChangePlanFeatures } from "@/hooks/mutations/use-change-plan-features";
import { usePlanFeatureImpact } from "@/hooks/queries/use-plan-feature-impact";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";

export type FeatureTarget = { plan: AdminSubscriptionPlan; code: string; label: string };

// Confirms taking an on/off feature off a plan, after showing who it reaches.
export function RemoveFeatureDialog({ target, onClose }: { target: FeatureTarget | null; onClose: () => void }) {
  const impact = usePlanFeatureImpact(target ? { planId: target.plan.id, code: target.code } : null);
  const mutation = useChangePlanFeatures(onClose);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-20px)] max-w-[480px] gap-0 rounded-[24px] border-0 bg-card p-0">
        <DialogHeader className="flex-row items-start gap-3 px-6 pt-6 pb-3 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <MinusCircle className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">
              Remove {target?.label} from {target?.plan.name}?
            </DialogTitle>
            <DialogDescription>No one loses what they paid for: current subscribers keep it until their period ends.</DialogDescription>
          </div>
        </DialogHeader>
        <div className="px-6 py-3">
          <FeatureImpactNote impact={impact.data} isLoading={impact.isLoading} planName={target?.plan.name ?? ""} />
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!target || impact.isLoading || mutation.isPending}
            onClick={() => target && mutation.mutate({ type: "remove", planId: target.plan.id, code: target.code })}
          >
            {mutation.isPending && <Spinner className="size-4" />}
            Remove from {target?.plan.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
