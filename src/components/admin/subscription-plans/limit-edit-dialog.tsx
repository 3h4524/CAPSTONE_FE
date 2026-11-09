"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";

import { FeatureImpactNote } from "@/components/admin/subscription-plans/feature-impact-note";
import type { FeatureTarget } from "@/components/admin/subscription-plans/remove-feature-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useChangePlanFeatures } from "@/hooks/mutations/use-change-plan-features";
import { usePlanFeatureImpact } from "@/hooks/queries/use-plan-feature-impact";

const MAX_LIMIT = 10_000;

export type LimitTarget = FeatureTarget & { current: number | null; unit: string | null };

// Sets a limit on a plan. Lowering it shows who keeps the old value until their period ends.
export function LimitEditDialog({ target, onClose }: { target: LimitTarget | null; onClose: () => void }) {
  const [text, setText] = useState("");
  const [noLimit, setNoLimit] = useState(false);
  // The value the preview asks about, settled after typing stops.
  const [preview, setPreview] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!target) return;
    setText(target.current === null ? "" : String(target.current));
    setNoLimit(target.current === null);
    setPreview(undefined);
  }, [target]);

  const parsed = noLimit ? null : text.trim() === "" ? undefined : Number(text);
  const isValid = parsed === null || (typeof parsed === "number" && Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_LIMIT);
  const isChanged = isValid && target !== null && parsed !== target.current;

  useEffect(() => {
    const timer = setTimeout(() => setPreview(isChanged ? (parsed as number | null) : undefined), 400);
    return () => clearTimeout(timer);
  }, [isChanged, parsed]);

  const impact = usePlanFeatureImpact(
    target && preview !== undefined ? { planId: target.plan.id, code: target.code, limitValue: preview } : null
  );
  const mutation = useChangePlanFeatures(onClose);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card w-[calc(100%-20px)] max-w-[480px] gap-0 rounded-[24px] border-0 p-0">
        <DialogHeader className="flex-row items-start gap-3 px-6 pt-6 pb-3 text-left">
          <div className="text-primary bg-ink-100 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Gauge className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">{target?.label}</DialogTitle>
            <DialogDescription>
              On {target?.plan.name}. Now {target?.current === null ? "no limit" : `${target?.current.toLocaleString()}${target?.unit ? ` ${target.unit}` : ""}`}.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-3 px-6 py-3">
          <div className="space-y-1.5">
            <label htmlFor="plan-limit-value" className="text-ink-700 text-sm font-medium">
              New limit{target?.unit ? ` (${target.unit})` : ""}
            </label>
            <Input
              id="plan-limit-value"
              type="number"
              min={0}
              max={MAX_LIMIT}
              value={noLimit ? "" : text}
              disabled={noLimit}
              placeholder={noLimit ? "No limit" : "e.g. 300"}
              aria-invalid={!isValid}
              onChange={(event) => setText(event.target.value)}
            />
            {!isValid && <p className="text-destructive text-xs">Enter a whole number from 0 to 10,000, or choose no limit.</p>}
          </div>
          <label className="text-ink-700 flex items-center gap-2 text-sm">
            <Checkbox checked={noLimit} onCheckedChange={(checked) => setNoLimit(checked === true)} aria-label="No limit" />
            No limit
          </label>
          {preview !== undefined && (
            <FeatureImpactNote impact={impact.data} isLoading={impact.isLoading} planName={target?.plan.name ?? ""} />
          )}
        </div>
        <div className="border-ink-100 flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isChanged || mutation.isPending}
            onClick={() => target && mutation.mutate({ type: "limit", planId: target.plan.id, code: target.code, limitValue: parsed as number | null })}
          >
            {mutation.isPending && <Spinner className="size-4" />}
            Save limit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
