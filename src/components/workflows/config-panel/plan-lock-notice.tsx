"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { planIssues } from "@/helpers/plan-features";
import { useEntitlements } from "@/hooks/queries/use-entitlements";

type PlanLockNoticeProps = {
  nodeType: string;
  config: Record<string, unknown>;
  onFix: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
};

// Explains, on the step itself, what the Seller's plan does not cover and offers the fix.
export const PlanLockNotice = ({
  nodeType,
  config,
  onFix,
  disabled = false,
}: PlanLockNoticeProps) => {
  const { data: entitlements } = useEntitlements();
  if (!entitlements) return null;

  const issues = planIssues(entitlements, nodeType, config);
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2 px-5 pt-4">
      {issues.map((issue) => (
        <div
          key={issue.message}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900"
        >
          <p className="flex items-start gap-1.5">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>{issue.message}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {issue.fix && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 bg-white text-xs"
                disabled={disabled}
                onClick={() => onFix(issue.fix!.patch)}
              >
                {issue.fix.label}
              </Button>
            )}
            <Link
              href={SUBSCRIPTION_PATH}
              className="font-semibold text-amber-900 underline underline-offset-2"
            >
              View plans
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
