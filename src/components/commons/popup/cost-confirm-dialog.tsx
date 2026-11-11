"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCostConfirmStore } from "@/stores/cost-confirm";

const usd = (amount: number) => `US$${amount.toFixed(2)}`;

/** Asks the seller to confirm what something paid costs, line by line, with the total last. */
export function CostConfirmDialog() {
  const request = useCostConfirmStore((state) => state.request);
  const answer = useCostConfirmStore((state) => state.answer);

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && answer(false)}>
      {request && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{request.title}</DialogTitle>
            {request.description && <DialogDescription>{request.description}</DialogDescription>}
          </DialogHeader>

          {request.lines.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <ul className="divide-y">
                {request.lines.map((line, index) => (
                  <li key={`${line.label}-${index}`} className="flex items-start justify-between gap-4 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={line.label}>
                        {line.label}
                      </p>
                      {line.detail && <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{line.detail}</p>}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">
                      {line.amountUsd > 0 ? usd(line.amountUsd) : <span className="text-muted-foreground">Free</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="bg-muted/40 flex items-baseline justify-between gap-4 border-t px-3 py-2.5">
                <span className="text-sm font-semibold">Estimated total</span>
                <span className="text-base font-semibold tabular-nums">{usd(request.totalUsd)}</span>
              </div>
            </div>
          )}

          {request.note && <p className="text-muted-foreground text-xs leading-relaxed">{request.note}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => answer(false)}>
              Cancel
            </Button>
            <Button onClick={() => answer(true)}>{request.confirmLabel ?? "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
