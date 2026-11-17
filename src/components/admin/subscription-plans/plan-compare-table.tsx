"use client";

import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isSafetyCap, type PlanFeatureDefinition } from "@/helpers/plan-features";
import { useIsPhone } from "@/hooks/use-is-phone";
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

// A plan's value for a feature: on/off for a flag; for a limit, null is no limit and 0 is off.
const settingOf = (plan: AdminSubscriptionPlan, feature: PlanFeatureDefinition) => {
  const row = plan.features.find((item) => item.code === feature.code);
  if (feature.kind === "flag") return { isOn: row?.isEnabled ?? false, limit: null };
  return { isOn: true, limit: row ? (row.isEnabled ? row.limitValue : 0) : null };
};

// Every plan side by side, one feature per row, so the Admin can set several plans on one screen.
// A click adds a feature at once; removing one or changing a limit asks first, as on the cards.
export function PlanCompareTable({ plans, features, catalog, isAdding, onAdd, onRemove, onEditLimit }: PlanCompareTableProps) {
  const { t } = useTranslation("common");
  const formatRunLimit = (value: number) => (value < 0 ? t("admin.plans.shared.noLimit") : value.toLocaleString());
  const isPhone = useIsPhone();
  const byCode = new Map(catalog.map((feature) => [feature.code, feature]));
  // A feature hidden from the add list keeps its row while any plan still has it.
  const rows = features.filter(
    (feature) =>
      feature.kind === "limit" ||
      (byCode.get(feature.code)?.isActive ?? true) ||
      plans.some((plan) => settingOf(plan, feature).isOn)
  );
  const groups = [...new Set(rows.map((feature) => feature.group))];

  if (isPhone && plans.length > 1) {
    return (
      <PhonePlanCompare
        plans={plans}
        rows={rows}
        groups={groups}
        units={byCode}
        isAdding={isAdding}
        onAdd={onAdd}
        onRemove={onRemove}
        onEditLimit={onEditLimit}
      />
    );
  }

  return (
    <Card className="border-ink-200/80 bg-card gap-0 overflow-hidden rounded-2xl border p-0 shadow-xs">
      <div className="overflow-x-auto">
        <table className="max-md:[&_th:first-child]:bg-card w-full min-w-[640px] border-collapse text-sm max-md:[&_th:first-child]:sticky max-md:[&_th:first-child]:left-0 max-md:[&_th:first-child]:z-1 max-md:[&_th:first-child]:w-36">
          <thead className="bg-card sticky top-0 z-10">
            <tr className="border-ink-200 border-b">
              <th scope="col" className="text-ink-500 w-[38%] px-5 py-4 text-left text-[11px] font-semibold tracking-wide uppercase">
                {t("admin.plans.shared.feature")}
              </th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col" className="px-4 py-4 text-center align-bottom">
                  <p className="text-ink-900 font-bold">{plan.name}</p>
                  <p className="text-ink-500 text-xs font-normal tabular-nums">{t("admin.plans.shared.pricePerMonth", { amount: formatVnd(plan.monthlyPriceVnd) })}</p>
                  <p className="text-ink-400 text-[11px] font-normal">
                    {t("admin.plans.compare.subscribers", { formatted: plan.activeSubscriberCount.toLocaleString() })}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <GroupRow label={t("admin.plans.compare.runLimits")} span={plans.length + 1} />
            <tr className="border-ink-100 border-b">
              <th scope="row" className="text-ink-700 px-5 py-2.5 text-left font-normal">
                {t("admin.plans.compare.productsPerRun")}
                <span className="text-ink-400 ml-1 text-xs">· {t("admin.plans.compare.setOnEditPlan")}</span>
              </th>
              {plans.map((plan) => (
                <td key={plan.id} className="text-ink-700 px-4 py-2.5 text-center font-semibold tabular-nums">
                  {formatRunLimit(plan.maxBatchSize)}
                </td>
              ))}
            </tr>
            <tr className="border-ink-100 border-b">
              <th scope="row" className="text-ink-700 px-5 py-2.5 text-left font-normal">
                {t("admin.plans.compare.designJobsAtOnce")}
                <span className="text-ink-400 ml-1 text-xs">· {t("admin.plans.compare.setOnEditPlan")}</span>
              </th>
              {plans.map((plan) => (
                <td key={plan.id} className="text-ink-700 px-4 py-2.5 text-center font-semibold tabular-nums">
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
    <tr className="bg-ink-50/80">
      <th colSpan={span} scope="colgroup" className="text-ink-500 px-5 py-2 text-left text-[11px] font-semibold tracking-wide uppercase max-md:px-3">
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
  const { t } = useTranslation("common");
  return (
    <>
      <GroupRow label={group} span={plans.length + 1} />
      {rows.map((feature) => (
        <tr key={feature.code} className="border-ink-100 hover:bg-ink-50/60 border-b">
          <th scope="row" className="text-ink-700 px-5 py-2.5 text-left font-normal wrap-anywhere max-md:px-3">
            {feature.label}
            {isSafetyCap(feature.code) && <span className="text-ink-400 ml-1 text-xs">· {t("admin.plans.shared.hiddenFromSellers")}</span>}
          </th>
          {plans.map((plan) => (
            <PlanCell
              key={plan.id}
              plan={plan}
              feature={feature}
              unit={units.get(feature.code)?.unit}
              isAdding={isAdding}
              onAdd={onAdd}
              onRemove={onRemove}
              onEditLimit={onEditLimit}
            />
          ))}
        </tr>
      ))}
    </>
  );
}

function PlanCell({
  plan,
  feature,
  unit,
  isAdding,
  onAdd,
  onRemove,
  onEditLimit,
}: {
  plan: AdminSubscriptionPlan;
  feature: PlanFeatureDefinition;
  unit?: string | null;
  isAdding: boolean;
  onAdd: PlanCompareTableProps["onAdd"];
  onRemove: PlanCompareTableProps["onRemove"];
  onEditLimit: PlanCompareTableProps["onEditLimit"];
}) {
  const { t } = useTranslation("common");
  const { isOn, limit } = settingOf(plan, feature);
  if (feature.kind === "limit") {
    return (
      <td className="px-4 py-1.5 text-center max-md:px-1">
        <button
          type="button"
          aria-label={t("admin.plans.compare.changeFeatureOnPlan", { feature: feature.label, plan: plan.name })}
          onClick={() => onEditLimit(plan, feature, limit)}
          className="group text-ink-700 hover:bg-ink-100 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold tabular-nums max-md:min-h-10 max-md:flex-col max-md:justify-center max-md:gap-0 max-md:px-1"
        >
          <span className="max-md:hidden">{limit === null ? t("admin.plans.shared.noLimit") : `${limit.toLocaleString()}${unit ? ` ${unit}` : ""}`}</span>
          <span className="md:hidden">{limit === null ? t("admin.plans.shared.noLimit") : limit.toLocaleString()}</span>
          {limit !== null && unit && <span className="text-ink-400 text-[10px] leading-tight font-normal wrap-anywhere md:hidden">{unit}</span>}
          <Pencil className="text-ink-300 group-hover:text-ink-600 size-3 max-md:hidden" />
        </button>
      </td>
    );
  }
  return (
    <td className="px-4 py-1.5 text-center max-md:px-1">
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={t("admin.plans.compare.featureOnPlan", { feature: feature.label, plan: plan.name })}
        title={isOn ? t("admin.plans.shared.removeFromThisPlan") : t("admin.plans.shared.addToThisPlan")}
        disabled={!isOn && isAdding}
        onClick={() => (isOn ? onRemove(plan, feature.code, feature.label) : onAdd(plan, feature.code))}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40 max-md:size-9",
          isOn
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            : "border-ink-200 text-ink-300 border-dashed hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
        )}
      >
        {isOn ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
    </td>
  );
}

const sameSetting = (a: AdminSubscriptionPlan, b: AdminSubscriptionPlan, feature: PlanFeatureDefinition) => {
  const left = settingOf(a, feature);
  const right = settingOf(b, feature);
  return left.isOn === right.isOn && left.limit === right.limit;
};

const RUN_LIMITS = [
  { labelKey: "admin.plans.compare.productsPerRun", valueOf: (plan: AdminSubscriptionPlan) => plan.maxBatchSize },
  { labelKey: "admin.plans.compare.designJobsAtOnce", valueOf: (plan: AdminSubscriptionPlan) => plan.maxConcurrentJobs },
];

/**
 * Two plans at a time on a phone, chosen above the table: every plan side by side has no room there.
 * It starts on what sets them apart, which is usually what the Admin came to look at.
 */
function PhonePlanCompare({
  plans,
  rows,
  groups,
  units,
  isAdding,
  onAdd,
  onRemove,
  onEditLimit,
}: {
  plans: AdminSubscriptionPlan[];
  rows: PlanFeatureDefinition[];
  groups: string[];
  units: Map<string, AdminFeature>;
  isAdding: boolean;
  onAdd: PlanCompareTableProps["onAdd"];
  onRemove: PlanCompareTableProps["onRemove"];
  onEditLimit: PlanCompareTableProps["onEditLimit"];
}) {
  const { t } = useTranslation("common");
  const formatRunLimit = (value: number) => (value < 0 ? t("admin.plans.shared.noLimit") : value.toLocaleString());
  const [leftId, setLeftId] = useState(plans[0].id);
  const [rightId, setRightId] = useState(plans[1].id);
  const [differencesOnly, setDifferencesOnly] = useState(true);
  // A plan deleted while chosen falls back to the first one that is not the other side.
  const left = plans.find((plan) => plan.id === leftId) ?? plans.find((plan) => plan.id !== rightId) ?? plans[0];
  const right = plans.find((plan) => plan.id === rightId && plan.id !== left.id) ?? plans.find((plan) => plan.id !== left.id) ?? plans[1];
  const pair = [left, right];

  // Choosing the plan already on the other side swaps them, so the two always differ.
  const choose = (side: "left" | "right", id: string) => {
    const other = side === "left" ? right.id : left.id;
    const current = side === "left" ? left.id : right.id;
    (side === "left" ? setLeftId : setRightId)(id);
    if (id === other) (side === "left" ? setRightId : setLeftId)(current);
  };

  const runLimits = RUN_LIMITS.filter((row) => !differencesOnly || row.valueOf(left) !== row.valueOf(right));
  const shownRows = rows.filter((feature) => !differencesOnly || !sameSetting(left, right, feature));
  const total = RUN_LIMITS.length + rows.length;
  const shown = runLimits.length + shownRows.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {pair.map((plan, index) => (
          <div key={index} className="border-ink-200 bg-card min-w-0 rounded-xl border p-2.5">
            <Select value={plan.id} onValueChange={(id) => choose(index === 0 ? "left" : "right", id)}>
              <SelectTrigger aria-label={index === 0 ? t("admin.plans.compare.firstPlan") : t("admin.plans.compare.secondPlan")} className="bg-card w-full font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-card w-(--radix-select-trigger-width)">
                {plans.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-ink-700 mt-2 text-xs font-semibold tabular-nums">{t("admin.plans.compare.perMonthShort", { amount: formatVnd(plan.monthlyPriceVnd) })}</p>
            <p className="text-ink-400 text-[11px]">{t("admin.plans.compare.subscribers", { formatted: plan.activeSubscriberCount.toLocaleString() })}</p>
          </div>
        ))}
      </div>

      <label className="text-ink-600 flex min-h-11 items-center justify-between gap-3 text-xs font-medium">
        <span>
          {t("admin.plans.compare.onlyWhatDiffers")} <span className="text-ink-400 tabular-nums">· {differencesOnly ? t("admin.plans.compare.shownOfTotal", { shown, total }) : t("admin.plans.compare.allTotal", { total })}</span>
        </span>
        <Switch checked={differencesOnly} onCheckedChange={setDifferencesOnly} aria-label={t("admin.plans.compare.onlyWhatDiffers")} />
      </label>

      {shown === 0 ? (
        <p className="border-ink-300 bg-card text-ink-500 rounded-xl border border-dashed p-6 text-center text-sm">
          {t("admin.plans.compare.matchEveryFeature", { left: left.name, right: right.name })}
        </p>
      ) : (
        <Card className="border-ink-200/80 bg-card gap-0 rounded-2xl border p-0 shadow-xs">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-20" />
            </colgroup>
            <thead className="bg-card sticky top-16 z-10">
              <tr className="border-ink-200 text-ink-500 border-b text-[11px] font-semibold">
                <th scope="col" className="bg-card rounded-tl-2xl px-3 py-2 text-left">{t("admin.plans.shared.feature")}</th>
                {pair.map((plan) => (
                  <th key={plan.id} scope="col" className="bg-card truncate px-1 py-2 text-center last:rounded-tr-2xl">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runLimits.length > 0 && <GroupRow label={t("admin.plans.compare.runLimits")} span={3} />}
              {runLimits.map((row) => (
                <tr key={row.labelKey} className="border-ink-100 border-b">
                  <th scope="row" className="text-ink-700 px-3 py-2.5 text-left font-normal wrap-anywhere">{t(row.labelKey)}</th>
                  {pair.map((plan) => (
                    <td key={plan.id} className="text-ink-700 px-1 py-2.5 text-center font-semibold tabular-nums">
                      {formatRunLimit(row.valueOf(plan))}
                    </td>
                  ))}
                </tr>
              ))}
              {groups.map((group) => {
                const groupRows = shownRows.filter((feature) => feature.group === group);
                return (
                  groupRows.length > 0 && (
                    <FeatureGroup
                      key={group}
                      group={group}
                      rows={groupRows}
                      plans={pair}
                      units={units}
                      isAdding={isAdding}
                      onAdd={onAdd}
                      onRemove={onRemove}
                      onEditLimit={onEditLimit}
                    />
                  )
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-ink-400 text-[11px]">{t("admin.plans.compare.runLimitsOnEditPlan")}</p>
    </div>
  );
}
