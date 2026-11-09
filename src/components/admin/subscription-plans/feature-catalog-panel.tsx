"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, EyeOff, Pencil, Search, X } from "lucide-react";

import { FeatureEditDialog } from "@/components/admin/subscription-plans/feature-edit-dialog";
import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminFeatures } from "@/hooks/queries/use-admin-features";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { AdminFeature } from "@/types/feature-catalog";
import { cn } from "@/utils/cn";

const DESKTOP_PAGE_SIZE = 10;
const PHONE_PAGE_SIZE = 5;

const formatEdited = (feature: AdminFeature) =>
  feature.updatedAt
    ? `Edited ${new Date(feature.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${feature.updatedByName ? ` by ${feature.updatedByName}` : ""}`
    : null;

const limitSummary = (feature: AdminFeature) =>
  [feature.defaultLimit === null ? "No limit by default" : `Default ${feature.defaultLimit.toLocaleString()}`, feature.unit]
    .filter(Boolean)
    .join(" ");

// The quick filters, each with the features it keeps.
const FILTERS = [
  { key: "all", label: "All", keep: () => true },
  { key: "flag", label: "On/off", keep: (feature: AdminFeature) => feature.kind === "flag" },
  { key: "limit", label: "Limits", keep: (feature: AdminFeature) => feature.kind === "limit" },
  { key: "no-plan", label: "In no plan", keep: (feature: AdminFeature) => feature.plans.length === 0 },
  { key: "no-trial", label: "Not in trial", keep: (feature: AdminFeature) => !feature.trialAvailable },
  { key: "hidden", label: "Hidden", keep: (feature: AdminFeature) => !feature.isActive },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// The plans named on any feature, the plan with the fewest features first (cheaper plans include less).
const planColumns = (features: AdminFeature[]) => {
  const counts = new Map<string, number>();
  features.forEach((feature) => feature.plans.forEach((plan) => counts.set(plan, (counts.get(plan) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => a[1] - b[1]).map(([plan]) => plan);
};

/**
 * Every feature APCS can put on a plan, as one table grouped as the Admin set them up: which plans
 * include it, whether the trial has it, its default limit and whether it is offered. A search and
 * quick filters find what needs a look. The features themselves are built in; here the Admin decides
 * how they are named, ordered and offered.
 */
export function FeatureCatalogPanel() {
  const { data: features, isLoading } = useAdminFeatures();
  const isPhone = useIsPhone();
  const pageSize = isPhone ? PHONE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const [editing, setEditing] = useState<AdminFeature | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  if (isLoading || !features) {
    return <Card className="border-ink-200/80 bg-card mt-6 h-96 animate-pulse rounded-2xl border" />;
  }

  const groups = [...new Set(features.map((feature) => feature.group))];
  const plans = planColumns(features);
  const keep = FILTERS.find((item) => item.key === filter)!.keep;
  const needle = query.trim().toLowerCase();
  const shown = features.filter(
    (feature) =>
      keep(feature) &&
      (!needle || [feature.label, feature.code, feature.description].some((text) => text.toLowerCase().includes(needle)))
  );
  // Ten at a time, in the order the table groups them; a new filter or search starts again at page one.
  const ordered = groups.flatMap((group) => shown.filter((feature) => feature.group === group));
  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = ordered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {isPhone ? (
          <Select
            value={filter}
            onValueChange={(next) => {
              setFilter(next as FilterKey);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter features" className="bg-card w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-card w-(--radix-select-trigger-width)">
              {FILTERS.map((item) => {
                const count = features.filter(item.keep).length;
                if (item.key !== "all" && count === 0) return null;
                return (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label} · {count}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter features">
          {FILTERS.map((item) => {
            const count = features.filter(item.keep).length;
            if (item.key !== "all" && count === 0) return null;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => {
                  setFilter(item.key);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  filter === item.key ? "border-ink-900 bg-ink-900 text-card" : "border-ink-200 bg-card text-ink-600 hover:border-ink-300"
                )}
              >
                {item.label}
                <span className={cn("tabular-nums", filter === item.key ? "text-white/70" : "text-ink-400")}>{count}</span>
              </button>
            );
          })}
        </div>
        )}
        <label className="relative block lg:w-72">
          <Search className="text-ink-400 absolute top-1/2 left-3 size-3.5 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or code"
            aria-label="Search features"
            className="border-ink-200 bg-card placeholder:text-ink-400 focus:border-ink-400 h-9 w-full rounded-lg border pr-3 pl-8 text-sm outline-none"
          />
        </label>
      </div>

      {isPhone ? (
        <div className="space-y-3">
          {groups.map((group) => {
            const rows = pageRows.filter((feature) => feature.group === group);
            if (rows.length === 0) return null;
            return (
              <section key={group} className="space-y-2">
                <h3 className="text-ink-400 text-[11px] font-semibold tracking-wide uppercase">{group}</h3>
                {rows.map((feature) => (
                  <FeatureCard key={feature.code} feature={feature} onEdit={setEditing} />
                ))}
              </section>
            );
          })}
          {shown.length === 0 && <p className="text-ink-500 py-10 text-center text-sm">No feature matches.</p>}
          <p className="text-ink-400 text-xs">
            {features.length} features in {groups.length} groups. New features are built by developers; here you choose how they are
            shown and offered.
          </p>
          <PhonePager page={current} pageCount={totalPages} onPageChange={setPage} label="Feature pages" />
        </div>
      ) : (
      <Card className="border-ink-200 bg-card gap-0 overflow-hidden rounded-2xl border p-0 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-ink-200 bg-ink-50/70 text-ink-500 border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                <th scope="col" className="px-5 py-2.5">Feature</th>
                <th scope="col" className="px-3 py-2.5">Type</th>
                <th scope="col" className="px-3 py-2.5">Plans</th>
                <th scope="col" className="px-3 py-2.5">Trial</th>
                <th scope="col" className="px-3 py-2.5">Default</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="w-12 px-3 py-2.5">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            {groups.map((group) => {
              const rows = pageRows.filter((feature) => feature.group === group);
              if (rows.length === 0) return null;
              return (
                <tbody key={group} className="border-ink-100 border-b last:border-b-0">
                  <tr>
                    <th colSpan={7} scope="colgroup" className="bg-card px-5 pt-4 pb-1.5 text-left">
                      <h3 className="text-ink-400 text-[11px] font-semibold tracking-wide uppercase">{group}</h3>
                    </th>
                  </tr>
                  {rows.map((feature) => (
                    <FeatureRow key={feature.code} feature={feature} plans={plans} onEdit={setEditing} />
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
        {shown.length === 0 && <p className="text-ink-500 py-10 text-center text-sm">No feature matches.</p>}
        {totalPages > 1 && (
          <nav aria-label="Feature pages" className="border-ink-100 text-ink-500 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-2.5 text-xs">
            <span className="tabular-nums">
              {(current - 1) * pageSize + 1}–{(current - 1) * pageSize + pageRows.length} of {ordered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <span className="tabular-nums">
                Page {current} of {totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-8" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </nav>
        )}
        <p className="border-ink-100 text-ink-400 border-t px-5 py-2.5 text-[11px]">
          {features.length} features in {groups.length} groups. New features are built by developers; here you choose how they are shown and
          offered.
        </p>
      </Card>
      )}

      <FeatureEditDialog feature={editing} groups={groups} onClose={() => setEditing(null)} />
    </div>
  );
}

const FeatureTrial = ({ feature }: { feature: AdminFeature }) =>
  feature.trialAvailable ? (
          <span className="inline-flex items-center gap-1 text-[#21796e] dark:text-[#8fe0d6]">
            <Check className="size-3.5" aria-hidden="true" /> In trial
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <X className="size-3.5" aria-hidden="true" /> Not in trial
          </span>
        );

const FeatureOffered = ({ feature }: { feature: AdminFeature }) =>
  feature.isActive ? (
          <span className="text-ink-500">Offered</span>
        ) : (
          <span className="bg-ink-200/70 text-ink-600 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold">
            <EyeOff className="size-3" aria-hidden="true" /> Hidden
          </span>
        );

/** A feature on a phone, where the table's seven columns have no room. */
function FeatureCard({ feature, onEdit }: { feature: AdminFeature; onEdit: (feature: AdminFeature) => void }) {
  return (
    <article className={cn("border-ink-200 bg-card rounded-xl border p-3.5 shadow-2xs", !feature.isActive && "bg-ink-50/60")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-sm font-semibold", feature.isActive ? "text-ink-900" : "text-ink-500")}>{feature.label}</span>
            <span className="bg-ink-100 text-ink-600 rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {feature.kind === "limit" ? "Limit" : "On/off"}
            </span>
          </p>
          {feature.description && <p className="text-ink-500 mt-1 text-xs">{feature.description}</p>}
          <p className="text-ink-400 mt-1 font-mono text-[11px] wrap-anywhere">{feature.code}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${feature.label}`} onClick={() => onEdit(feature)}>
          <Pencil className="size-3.5" />
        </Button>
      </div>
      <div className="border-ink-100 mt-2.5 space-y-2 border-t pt-2.5 text-xs">
        {feature.plans.length === 0 ? (
          <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">In no plan</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {feature.plans.map((plan) => (
              <span
                key={plan}
                className="inline-flex items-center gap-1 rounded-full border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-2 py-0.5 text-[11px] font-semibold text-[#21796e] dark:text-[#8fe0d6]"
              >
                <Check className="size-3" aria-hidden="true" />
                {plan}
              </span>
            ))}
          </span>
        )}
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <FeatureTrial feature={feature} />
          {feature.kind === "limit" && <span className="text-ink-600 tabular-nums">{limitSummary(feature)}</span>}
          <FeatureOffered feature={feature} />
        </p>
      </div>
    </article>
  );
}

function FeatureRow({ feature, plans, onEdit }: { feature: AdminFeature; plans: string[]; onEdit: (feature: AdminFeature) => void }) {
  const edited = formatEdited(feature);
  return (
    <tr className={cn("group hover:bg-ink-50/70 align-top", !feature.isActive && "bg-ink-50/50")}>
      <th scope="row" className="px-5 py-3 text-left font-normal">
        <p className={cn("font-semibold", feature.isActive ? "text-ink-900" : "text-ink-500")}>{feature.label}</p>
        {feature.description && <p className="text-ink-500 mt-0.5 max-w-md text-xs">{feature.description}</p>}
        <p className="text-ink-400 mt-1 flex flex-wrap gap-x-3 text-[11px]">
          <span className="font-mono">{feature.code}</span>
          {edited && <span>{edited}</span>}
        </p>
      </th>
      <td className="px-3 py-3">
        <span className="bg-ink-100 text-ink-600 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
          {feature.kind === "limit" ? "Limit" : "On/off"}
        </span>
      </td>
      <td className="px-3 py-3">
        {feature.plans.length === 0 ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">In no plan</span>
        ) : (
          // One chip per plan, filled when the plan includes it, so coverage reads down the column.
          <span className="flex flex-wrap gap-1">
            {plans.map((plan) => {
              const included = feature.plans.includes(plan);
              return (
                <span
                  key={plan}
                  aria-label={`${plan}: ${included ? "included" : "not included"}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                    included ? "border-[#2a9d8f]/30 bg-[#2a9d8f]/10 text-[#21796e] dark:text-[#8fe0d6]" : "border-ink-200 text-ink-400 border-dashed"
                  )}
                >
                  {included && <Check className="size-3" aria-hidden="true" />}
                  {plan}
                </span>
              );
            })}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-xs whitespace-nowrap">
        <FeatureTrial feature={feature} />
      </td>
      <td className="text-ink-600 px-3 py-3 text-xs whitespace-nowrap tabular-nums">
        {feature.kind === "limit" ? limitSummary(feature) : <span className="text-ink-300">—</span>}
      </td>
      <td className="px-3 py-3 text-xs whitespace-nowrap">
        <FeatureOffered feature={feature} />
      </td>
      <td className="px-3 py-2.5">
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${feature.label}`} onClick={() => onEdit(feature)}>
          <Pencil className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}
