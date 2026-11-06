"use client";

import { Check, Pencil, Plus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { isSafetyCap, type PlanFeatureDefinition } from "@/helpers/plan-features";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

type PlanCompareTableProps = {
  plans: AdminSubscriptionPlan[];
  features: PlanFeatureDefinition[];
  catalog: AdminFeature[];
  isAdding: boolean;
  onAdd: (plan: AdminSubscriptionPlan, code: string) => void;
  onRemove: (plan: AdminSubscriptionPlan, code: string, label: string) => void;
  onEditLimit: (plan: AdminSubscriptionPlan, feature: PlanFeatureDefinition, current: number | null) => void;
};

const formatRunLimit = (value: number) => (value < 0 ? "No limit" : value.toLocaleString());

// A plan's value for a feature: on/off for a flag; for a limit, null is no limit and 0 is off.
const settingOf = (plan: AdminSubscriptionPlan, feature: PlanFeatureDefinition) => {
  const row = plan.features.find((item) => item.code === feature.code);
  if (feature.kind === "flag") return { isOn: row?.isEnabled ?? false, limit: null };
  return { isOn: true, limit: row ? (row.isEnabled ? row.limitValue : 0) : null };
};

// Every plan side by side, one feature per row, so the Admin can set several plans on one screen.
// A click adds a feature at once; removing one or changing a limit asks first, as on the cards.
export function PlanCompareTable({ plans, features, catalog, isAdding, onAdd, onRemove, onEditLimit }: PlanCompareTableProps) {
  const byCode = new Map(catalog.map((feature) => [feature.code, feature]));
  // A feature hidden from the add list keeps its row while any plan still has it.
  const rows = features.filter(
    (feature) =>
      feature.kind === "limit" ||
      (byCode.get(feature.code)?.isActive ?? true) ||
      plans.some((plan) => settingOf(plan, feature).isOn)
  );
  const groups = [...new Set(rows.map((feature) => feature.group))];

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm max-md:[&_th:first-child]:sticky max-md:[&_th:first-child]:left-0 max-md:[&_th:first-child]:z-1 max-md:[&_th:first-child]:w-36 max-md:[&_th:first-child]:bg-white">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-slate-200">
              <th scope="col" className="w-[38%] px-5 py-4 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Feature
              </th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col" className="px-4 py-4 text-center align-bottom">
                  <p className="font-bold text-slate-900">{plan.name}</p>
                  <p className="text-xs font-normal text-slate-500 tabular-nums">{formatVnd(plan.monthlyPriceVnd)} / month</p>
                  <p className="text-[11px] font-normal text-slate-400">
                    {plan.activeSubscriberCount.toLocaleString()} subscribers
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <GroupRow label="Run limits" span={plans.length + 1} />
            <tr className="border-b border-slate-100">
              <th scope="row" className="px-5 py-2.5 text-left font-normal text-slate-700">
                Products per run
                <span className="ml-1 text-xs text-slate-400">· set on Edit plan</span>
              </th>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-2.5 text-center font-semibold text-slate-700 tabular-nums">
                  {formatRunLimit(plan.maxBatchSize)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <th scope="row" className="px-5 py-2.5 text-left font-normal text-slate-700">
                Design jobs at once
                <span className="ml-1 text-xs text-slate-400">· set on Edit plan</span>
              </th>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-2.5 text-center font-semibold text-slate-700 tabular-nums">
                  {formatRunLimit(plan.maxConcurrentJobs)}
                </td>
              ))}
            </tr>

            {groups.map((group) => (
              <FeatureGroup
                key={group}
                group={group}
                rows={rows.filter((feature) => feature.group === group)}
                plans={plans}
                units={byCode}
                isAdding={isAdding}
                onAdd={onAdd}
                onRemove={onRemove}
                onEditLimit={onEditLimit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GroupRow({ label, span }: { label: string; span: number }) {
  return (
    <tr className="bg-slate-50/80">
      <th colSpan={span} scope="colgroup" className="px-5 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </th>
    </tr>
  );
}

function FeatureGroup({
  group,
  rows,
  plans,
  units,
  isAdding,
  onAdd,
  onRemove,
  onEditLimit,
}: {
  group: string;
  rows: PlanFeatureDefinition[];
  plans: AdminSubscriptionPlan[];
  units: Map<string, AdminFeature>;
  isAdding: boolean;
  onAdd: PlanCompareTableProps["onAdd"];
  onRemove: PlanCompareTableProps["onRemove"];
  onEditLimit: PlanCompareTableProps["onEditLimit"];
}) {
  return (
    <>
      <GroupRow label={group} span={plans.length + 1} />
      {rows.map((feature) => (
        <tr key={feature.code} className="border-b border-slate-100 hover:bg-slate-50/60">
          <th scope="row" className="px-5 py-2.5 text-left font-normal text-slate-700">
            {feature.label}
            {isSafetyCap(feature.code) && <span className="ml-1 text-xs text-slate-400">· hidden from Sellers</span>}
          </th>
          {plans.map((plan) => {
            const { isOn, limit } = settingOf(plan, feature);
            if (feature.kind === "limit") {
              const unit = units.get(feature.code)?.unit;
              return (
                <td key={plan.id} className="px-4 py-1.5 text-center">
                  <button
                    type="button"
                    aria-label={`Change ${feature.label} on ${plan.name}`}
                    onClick={() => onEditLimit(plan, feature, limit)}
                    className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold text-slate-700 tabular-nums hover:bg-slate-100"
                  >
                    {limit === null ? "No limit" : `${limit.toLocaleString()}${unit ? ` ${unit}` : ""}`}
                    <Pencil className="size-3 text-slate-300 group-hover:text-slate-600" />
                  </button>
                </td>
              );
            }
            return (
              <td key={plan.id} className="px-4 py-1.5 text-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`${feature.label} on ${plan.name}`}
                  title={isOn ? "Remove from this plan" : "Add to this plan"}
                  disabled={!isOn && isAdding}
                  onClick={() => (isOn ? onRemove(plan, feature.code, feature.label) : onAdd(plan, feature.code))}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40",
                    isOn
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      : "border-dashed border-slate-200 text-slate-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  )}
                >
                  {isOn ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
