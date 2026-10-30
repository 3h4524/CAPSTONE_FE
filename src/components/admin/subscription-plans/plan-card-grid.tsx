"use client";

import { Check, Layers, Pencil, Trash2, Users, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAN_FEATURES } from "@/helpers/plan-features";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

type PlanCardGridProps = {
  plans: AdminSubscriptionPlan[];
  isLoading: boolean;
  onEdit: (plan: AdminSubscriptionPlan) => void;
  onDelete: (plan: AdminSubscriptionPlan) => void;
};

const formatLimit = (value: number) => (value < 0 ? "No limit" : value.toLocaleString());

// The plan's flag features, and the variation limit, as the Admin compares plans. Safety caps
// are shown apart: they only stop abuse.
const featureRows = (plan: AdminSubscriptionPlan) =>
  PLAN_FEATURES.filter((feature) => !feature.code.startsWith("daily_")).map((definition) => {
    const row = plan.features.find((feature) => feature.code === definition.code);
    if (definition.kind === "limit") {
      const limit = row?.limitValue ?? null;
      return {
        code: definition.code,
        label: limit === null ? "Design variations: no limit" : `Up to ${limit} design variations`,
        included: true,
      };
    }
    return { code: definition.code, label: definition.label, included: row?.isEnabled ?? false };
  });

const safetyCaps = (plan: AdminSubscriptionPlan) =>
  PLAN_FEATURES.filter((feature) => feature.code.startsWith("daily_")).map((definition) => {
    const limit =
      plan.features.find((feature) => feature.code === definition.code)?.limitValue ?? null;
    return {
      code: definition.code,
      label: definition.label.replace("Daily ", "").replace(" safety cap", ""),
      limit,
    };
  });

export function PlanCardGrid({ plans, isLoading, onEdit, onDelete }: PlanCardGridProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
          />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Layers className="mx-auto size-6 text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-700">No subscription plans yet</p>
        <p className="text-xs text-slate-400">Create the first one with “Create new plan”.</p>
      </Card>
    );
  }

  const sellingPlans = plans.filter((plan) => plan.isActive);
  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.activeSubscriberCount, 0);
  const totalTrials = plans.reduce((sum, plan) => sum + (plan.trialSubscriberCount ?? 0), 0);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
        <span>
          <strong className="text-slate-800">{sellingPlans.length}</strong> of {plans.length} plans
          on sale
        </span>
        <span>
          <strong className="text-slate-800">{totalSubscribers.toLocaleString()}</strong> paying
          subscribers
        </span>
        {totalTrials > 0 && (
          <span>
            <strong className="text-slate-800">{totalTrials.toLocaleString()}</strong> on free trial
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: AdminSubscriptionPlan;
  onEdit: (plan: AdminSubscriptionPlan) => void;
  onDelete: (plan: AdminSubscriptionPlan) => void;
}) {
  const features = featureRows(plan);
  const included = features.filter((feature) => feature.included).length;

  return (
    <Card
      className={cn(
        "flex flex-col gap-0 overflow-hidden rounded-2xl border bg-white p-0 shadow-xs transition-shadow hover:shadow-md",
        plan.isActive ? "border-slate-200/80" : "border-dashed border-slate-300 bg-slate-50/60"
      )}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">{plan.name}</h3>
            <Badge
              variant="outline"
              className={cn(
                "border-0 text-[10px] font-semibold",
                plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {plan.isActive ? "On sale" : "Not on sale"}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{plan.tier}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${plan.name}`}
            onClick={() => onEdit(plan)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${plan.name}`}
            title={
              plan.canDelete
                ? "Delete plan"
                : "This plan has subscribers. Take it off sale instead."
            }
            onClick={() => onDelete(plan)}
          >
            <Trash2
              className={cn("size-3.5", plan.canDelete ? "text-rose-500" : "text-slate-300")}
            />
          </Button>
        </div>
      </div>

      <div className="px-5">
        <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {formatVnd(plan.monthlyPriceVnd)}
          <span className="text-sm font-normal text-slate-400"> / month</span>
        </p>
        {plan.annualPriceVnd !== null && (
          <p className="text-[11px] text-slate-400">
            {formatVnd(plan.annualPriceVnd)} / year
          </p>
        )}
        {plan.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
            {plan.description}
          </p>
        )}
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-2.5 text-center">
        <Stat
          label="Subscribers"
          value={plan.activeSubscriberCount.toLocaleString()}
          icon
          extra={<TrialBadge count={plan.trialSubscriberCount ?? 0} planName={plan.name} />}
        />
        <Stat label="Per run" value={formatLimit(plan.maxBatchSize)} />
        <Stat label="Jobs at once" value={formatLimit(plan.maxConcurrentJobs)} />
      </div>

      <div className="flex-1 px-5 pt-4">
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Features · {included}/{features.length}
        </p>
        <ul className="space-y-1.5">
          {features.map((feature) => (
            <li
              key={feature.code}
              className={cn(
                "flex items-center gap-2 text-xs",
                feature.included ? "text-slate-700" : "text-slate-400"
              )}
            >
              {feature.included ? (
                <Check className="size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <X className="size-3.5 shrink-0 text-slate-300" />
              )}
              {feature.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-slate-100 px-5 py-3">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Daily safety caps (hidden from Sellers)
        </p>
        <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
          {safetyCaps(plan)
            .map(
              (cap) => `${cap.label}: ${cap.limit === null ? "none" : cap.limit.toLocaleString()}`
            )
            .join(" · ")}
        </p>
      </div>
    </Card>
  );
}

// Trials sit beside the subscriber count, never added to it: they have not paid yet.
function TrialBadge({ count, planName }: { count: number; planName: string }) {
  if (count <= 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="cursor-help rounded-full bg-[#2a9d8f]/12 px-1.5 py-px text-[10px] font-semibold text-[#21796e]"
          >
            +{count.toLocaleString()} trial
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-xs">
          {count.toLocaleString()} Sellers on a free {planName} trial. Not counted as subscribers
          until they pay.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  icon = false,
  extra,
}: {
  label: string;
  value: string;
  icon?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-2">
      <p className="flex flex-wrap items-center justify-center gap-1 text-sm font-bold text-slate-900 tabular-nums">
        {icon && <Users className="size-3.5 text-slate-400" />}
        {value}
        {extra}
      </p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}
