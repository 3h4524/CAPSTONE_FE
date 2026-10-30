"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { allowanceResetLine, remaining } from "@/helpers/allowance";
import { useAllowances } from "@/hooks/queries/use-allowances";

// What a Seller on Free or the Pro trial has used of their allowances. Paid plans have none.
export const AllowanceCard = () => {
  const { data: allowances } = useAllowances();
  if (!allowances || allowances.scope === null) return null;

  const isTrial = allowances.scope === "trial";
  const reset = allowanceResetLine(allowances);

  return (
    <Card aria-label="Plan allowance">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-semibold">{isTrial ? "Your Pro trial" : "Free this month"}</h3>
            <p className="text-muted-foreground text-sm">
              {isTrial
                ? "Standard videos only. Choose a plan to keep going when it runs out."
                : `Standard videos only, one product per run${allowances.mockupsPerRun !== null ? ` and up to ${allowances.mockupsPerRun} mockups` : ""}.`}
            </p>
          </div>
          {reset && <span className="text-muted-foreground text-xs">{reset}</span>}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allowances.items.map((item) => (
            <li key={item.code} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="capitalize">{item.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {item.used} / {item.limit}
                </span>
              </div>
              <Progress value={item.limit > 0 ? (item.used / item.limit) * 100 : 100} />
              {remaining(item) === 0 && <p className="text-xs font-medium text-rose-700">None left</p>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
