"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";

import { FeatureChooserDialog } from "@/components/admin/subscription-plans/feature-chooser-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isSafetyCap } from "@/helpers/plan-features";
import type { AdminSubscriptionPlan, PlanFeatureInput } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";

// What a new plan will include: an on/off feature is picked or not, a limit has a value (null = no limit).
export type FeaturePicks = Record<string, { on: boolean; limit: number | null }>;

// The basic pipeline, ticked for a new plan so it can run a workflow from the start.
const BASICS = ["design_images", "template_mockups", "standard_video", "zip_export"];

const MAX_LIMIT = 10_000;

// The features a new plan can take: every on/off feature on offer, and every limit (a limit is
// always part of a plan).
const offered = (catalog: AdminFeature[]) => catalog.filter((feature) => feature.kind === "limit" || feature.isActive);

// A new plan's starting picks: the basics on, every limit at its catalog default.
export const initialPicks = (catalog: AdminFeature[]): FeaturePicks =>
  Object.fromEntries(
    offered(catalog).map((feature) => [
      feature.code,
      { on: feature.kind === "limit" || BASICS.includes(feature.code), limit: feature.kind === "limit" ? feature.defaultLimit : null },
    ])
  );

// The picks of an existing plan, to start a new plan from it.
export const picksFromPlan = (catalog: AdminFeature[], plan: AdminSubscriptionPlan): FeaturePicks =>
  Object.fromEntries(
    offered(catalog).map((feature) => {
      const row = plan.features.find((item) => item.code === feature.code);
      return feature.kind === "limit"
        ? [feature.code, { on: true, limit: row ? (row.isEnabled ? row.limitValue : 0) : null }]
        : [feature.code, { on: row?.isEnabled ?? false, limit: null }];
    })
  );

// The features to send with a new plan: the picked on/off features and every limit.
export const toFeatureInputs = (catalog: AdminFeature[], picks: FeaturePicks): PlanFeatureInput[] =>
  offered(catalog)
    .filter((feature) => picks[feature.code]?.on)
    .map((feature) => ({
      code: feature.code,
      isEnabled: true,
      limitValue: feature.kind === "limit" ? (picks[feature.code]?.limit ?? null) : null,
    }));

export const picksAreValid = (picks: FeaturePicks) =>
  Object.values(picks).every((pick) => pick.limit === null || (Number.isInteger(pick.limit) && pick.limit >= 0 && pick.limit <= MAX_LIMIT));

type PlanFeaturePickerProps = {
  catalog: AdminFeature[];
  plans: AdminSubscriptionPlan[];
  picks: FeaturePicks;
  onChange: (picks: FeaturePicks) => void;
};

// A new plan's features: what it includes so far (the basics to start with), a button to add more
// from the catalog, and its limits. It can also start from an existing plan's features.
export function PlanFeaturePicker({ catalog, plans, picks, onChange }: PlanFeaturePickerProps) {
  const [isChoosing, setIsChoosing] = useState(false);
  const features = offered(catalog);
  const flags = features.filter((feature) => feature.kind === "flag");
  const included = flags.filter((feature) => picks[feature.code]?.on);
  const limits = features.filter((feature) => feature.kind === "limit");
  const set = (code: string, change: Partial<FeaturePicks[string]>) => onChange({ ...picks, [code]: { ...picks[code], ...change } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">Starts with the basic pipeline. Add what else this plan sells.</p>
        {plans.length > 0 && (
          <Select
            value=""
            onValueChange={(planId) => {
              const plan = plans.find((item) => item.id === planId);
              if (plan) onChange(picksFromPlan(catalog, plan));
            }}
          >
            <SelectTrigger className="h-8 w-52 text-xs" aria-label="Copy features from a plan">
              <SelectValue placeholder="Copy features from…" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Included · {included.length}</p>
        {included.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">No features yet. Add the ones this plan sells.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {included.map((feature) => (
              <li key={feature.code} className="flex items-center gap-3 px-3.5 py-2.5">
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-700">{feature.label}</span>
                  {feature.description && <span className="block text-xs text-slate-500">{feature.description}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${feature.label}`}
                  onClick={() => set(feature.code, { on: false })}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 w-full border-dashed text-xs text-slate-600"
          disabled={included.length === flags.length}
          onClick={() => setIsChoosing(true)}
        >
          <Plus className="size-3.5" /> {included.length === flags.length ? "Every feature on offer is included" : "Add feature"}
        </Button>
      </div>

      {limits.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Limits</p>
          <p className="mb-2 text-xs text-slate-500">Each starts at its catalog default; leave one empty for no limit.</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {limits.map((feature) => {
              const id = `new-plan-${feature.code}`;
              return (
                <li key={feature.code} className="flex items-center gap-3 px-3.5 py-2.5">
                  <label htmlFor={id} className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                    {feature.label}
                    {isSafetyCap(feature.code) && <span className="ml-1 text-xs font-normal text-slate-400">· hidden from Sellers</span>}
                  </label>
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    max={MAX_LIMIT}
                    placeholder="No limit"
                    className="h-8 w-24 text-right"
                    value={picks[feature.code]?.limit ?? ""}
                    onChange={(event) => set(feature.code, { on: true, limit: event.target.value === "" ? null : Number(event.target.value) })}
                  />
                  <span className="w-16 text-xs text-slate-400">{feature.unit}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FeatureChooserDialog
        open={isChoosing}
        title="Add features to the new plan"
        description="Pick what else this plan sells. You can still change it on the plan card later."
        candidates={flags.filter((feature) => !picks[feature.code]?.on)}
        onAdd={(codes) => {
          onChange({ ...picks, ...Object.fromEntries(codes.map((code) => [code, { on: true, limit: null }])) });
          setIsChoosing(false);
        }}
        onClose={() => setIsChoosing(false)}
      />
    </div>
  );
}
