"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Gift, Pencil, RotateCcw, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useUpdatePlanSettings } from "@/hooks/mutations/use-update-plan-settings";
import { usePlanSettings } from "@/hooks/queries/use-plan-settings";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { AllowanceScope, AllowanceSetting, PlanSettings } from "@/types/plan-settings";
import { cn } from "@/utils/cn";

const MAX_LIMIT = 10_000;
const MAX_TRIAL_DAYS = 90;
const DEFAULT_TRIAL_DAYS = 14;
const keyOf = (item: { scope: AllowanceScope; code: string }) => `${item.scope}.${item.code}`;

const formatEdited = (settings: PlanSettings) =>
  settings.updatedAt
    ? `Last changed ${new Date(settings.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${settings.updatedByName ? ` by ${settings.updatedByName}` : ""}`
    : "Shipped defaults";

// Free and the free trial are not plans, so they sit under the plans: what each includes, and
// which plan the trial gives.
export function FreeTrialCard() {
  const { data: settings, isLoading } = usePlanSettings();
  const [isEditing, setIsEditing] = useState(false);
  // A phone keeps the allowances folded, so the plans above stay within reach.
  const isPhone = useIsPhone();
  const [isAllowancesOpen, setIsAllowancesOpen] = useState(false);

  if (isLoading || !settings) {
    return <Card className="h-48 animate-pulse rounded-2xl border border-ink-200/80 bg-card" />;
  }

  const trialPlan = settings.trialPlans.find((plan) => plan.tier === settings.trialPlanTier);
  const free = settings.allowances.filter((item) => item.scope === "free");
  const trial = settings.allowances.filter((item) => item.scope === "trial");
  const changed = settings.allowances.filter((item) => item.limit !== item.default).length;
  const freeByCode = new Map(free.map((item) => [item.code, item.limit]));
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-ink-200 bg-card p-0 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 max-md:flex-nowrap max-md:px-4 max-md:pt-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-900">Free and free trial</h3>
          <p className="text-xs text-ink-500">Not plans Sellers buy, so they are set here. Changes apply at once.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-ink-400 sm:inline">{formatEdited(settings)}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(true)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* The figures to check at a glance before opening the editor. */}
      <div className="mx-6 mt-4 grid grid-cols-2 divide-ink-100 rounded-xl bg-ink-50 py-2.5 text-center max-md:mx-4 sm:grid-cols-4 sm:divide-x">
        <Figure label="Trials running" value={settings.activeTrials.toLocaleString()} />
        <Figure label="Trial gives" value={trialPlan?.name ?? settings.trialPlanTier} tone={trialPlan ? undefined : "warning"} />
        <Figure label="Trial length" value={`${settings.trialDays} days`} />
        <Figure
          label="Changed from defaults"
          value={`${changed} of ${settings.allowances.length}`}
          tone={changed > 0 ? "accent" : undefined}
        />
      </div>

      {isPhone && !isAllowancesOpen && !trialPlan && (
        <p role="alert" className="mx-4 mt-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          This plan is not on sale: new trials cannot start. Choose another plan.
        </p>
      )}
      {isPhone && (
        <button
          type="button"
          aria-expanded={isAllowancesOpen}
          className="mx-4 mt-1 mb-2 flex min-h-11 items-center gap-1 text-xs font-semibold text-ink-600"
          onClick={() => setIsAllowancesOpen((open) => !open)}
        >
          <ChevronDown className={cn("size-3.5 transition-transform", isAllowancesOpen && "rotate-180")} aria-hidden="true" />
          {isAllowancesOpen ? "Hide allowances" : "Show allowances"}
        </button>
      )}
      {(!isPhone || isAllowancesOpen) && (
      <div className="grid grid-cols-1 gap-4 p-6 max-md:p-4 max-md:pt-0 md:grid-cols-2">
        <Panel
          icon={<Gift className="size-4" />}
          title="Free"
          subtitle={`Each calendar month, from the 1st · next reset ${nextReset}`}
          items={free}
        />
        <Panel
          icon={<Sparkles className="size-4" />}
          title={`Free trial · ${trialPlan?.name ?? settings.trialPlanTier}`}
          subtitle={`${settings.trialDays} days, counted over the whole trial · ${settings.activeTrials.toLocaleString()} running now`}
          warning={trialPlan ? null : "This plan is not on sale: new trials cannot start. Choose another plan."}
          items={trial}
          // How the trial compares with Free and with the plan it gives, so a value that is off stands out.
          hintFor={(item) => {
            if (item.code === "products_per_run" && trialPlan)
              return trialPlan.maxBatchSize < 0 ? `${trialPlan.name} has no limit` : `${trialPlan.name} allows ${trialPlan.maxBatchSize}`;
            const monthly = freeByCode.get(item.code);
            return monthly ? `${Math.round((item.limit / monthly) * 10) / 10}× a Free month` : null;
          }}
        />
      </div>
      )}
      <PlanSettingsDialog open={isEditing} settings={settings} onClose={() => setIsEditing(false)} />
    </Card>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "warning" | "accent" }) {
  return (
    <div className="min-w-0 px-2 py-1">
      <p
        className={cn(
          "truncate text-sm font-bold tabular-nums",
          tone === "warning" ? "text-amber-700 dark:text-amber-300" : tone === "accent" ? "text-violet-700 dark:text-violet-300" : "text-ink-900"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-ink-400">{label}</p>
    </div>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  warning,
  items,
  hintFor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  warning?: string | null;
  items: AllowanceSetting[];
  hintFor?: (item: AllowanceSetting) => string | null;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 p-4">
      <div className="flex items-center gap-2 text-ink-900">
        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1 text-[11px] text-ink-400">{subtitle}</p>
      {warning && <p className="mt-2 rounded-md bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">{warning}</p>}
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const isChanged = item.limit !== item.default;
          const hint = hintFor?.(item);
          return (
            <li
              key={keyOf(item)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                isChanged ? "border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/10" : "border-ink-100 bg-ink-50/60"
              )}
            >
              <span className="block truncate text-ink-500">{item.label}</span>
              <span className="text-base font-bold text-ink-900 tabular-nums">{item.limit.toLocaleString()}</span>
              {isChanged && (
                <span className="ml-1 text-[10px] text-violet-700 dark:text-violet-300">
                  <span aria-hidden="true">{item.limit > item.default ? "▲ " : "▼ "}</span>
                  <span>(default {item.default})</span>
                </span>
              )}
              {hint && <span className="block truncate text-[10px] text-ink-400">{hint}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlanSettingsDialog({ open, settings, onClose }: { open: boolean; settings: PlanSettings; onClose: () => void }) {
  const [trialPlanTier, setTrialPlanTier] = useState(settings.trialPlanTier);
  const [trialDaysText, setTrialDaysText] = useState(String(settings.trialDays));
  const [values, setValues] = useState<Record<string, string>>({});
  const mutation = useUpdatePlanSettings(onClose);

  useEffect(() => {
    if (!open) return;
    setTrialPlanTier(settings.trialPlanTier);
    setTrialDaysText(String(settings.trialDays));
    setValues(Object.fromEntries(settings.allowances.map((item) => [keyOf(item), String(item.limit)])));
  }, [open, settings]);

  const parsed = settings.allowances.map((item) => ({ ...item, value: Number(values[keyOf(item)]) }));
  const invalid = parsed.filter((item) => !Number.isInteger(item.value) || item.value < 0 || item.value > MAX_LIMIT);
  const lowered = parsed.filter((item) => Number.isInteger(item.value) && item.value < item.limit);
  const trialPlan = settings.trialPlans.find((plan) => plan.tier === trialPlanTier);
  const perRun = parsed.find((item) => item.scope === "trial" && item.code === "products_per_run")?.value ?? 1;
  const products = parsed.find((item) => item.scope === "trial" && item.code === "products")?.value ?? 0;
  const trialDays = Number(trialDaysText);
  const isTrialDaysInvalid = !Number.isInteger(trialDays) || trialDays < 1 || trialDays > MAX_TRIAL_DAYS;
  const ruleError = isTrialDaysInvalid
    ? `A free trial lasts between 1 and ${MAX_TRIAL_DAYS} days.`
    : perRun < 1
      ? "A trial must run at least 1 product at a time."
      : perRun > products
        ? "Trial products per run cannot be more than the trial's products."
        : trialPlan && trialPlan.maxBatchSize >= 0 && perRun > trialPlan.maxBatchSize
          ? `Trial products per run cannot be more than ${trialPlan.name}'s ${trialPlan.maxBatchSize} per run.`
          : null;

  const save = () =>
    mutation.mutate({
      trialPlanTier,
      trialDays,
      allowances: parsed.map((item) => ({ scope: item.scope, code: item.code, limit: item.value })),
    });

  const section = (scope: AllowanceScope, title: string) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {parsed
          .filter((item) => item.scope === scope)
          .map((item) => {
            const id = `allowance-${scope}-${item.code}`;
            const isInvalid = invalid.includes(item);
            return (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="text-xs font-medium text-ink-600">
                  {item.label}
                </label>
                <Input
                  id={id}
                  type="number"
                  min={0}
                  max={MAX_LIMIT}
                  value={values[keyOf(item)] ?? ""}
                  aria-invalid={isInvalid}
                  onChange={(event) => setValues((current) => ({ ...current, [keyOf(item)]: event.target.value }))}
                  className={cn("h-9", item.value < item.limit && "border-amber-300 dark:border-amber-500/40")}
                />
                <p className="text-[10px] text-ink-400">Default {item.default}</p>
              </div>
            );
          })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 bg-card p-0"
      >
        <DialogHeader className="relative px-6 pt-6 pr-16 pb-3 text-left">
          <DialogTitle className="font-display text-xl tracking-[-0.02em]">Free and free trial</DialogTitle>
          <DialogDescription>What Free includes each month, which plan the trial gives, and what the trial includes.</DialogDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 size-10 rounded-lg text-ink-500 hover:bg-ink-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-3">
          {section("free", "Free, each month")}
          <div className="grid gap-3 sm:grid-cols-[16rem_10rem]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-600" id="trial-plan-label">
                The free trial gives
              </label>
              <Select value={trialPlanTier} onValueChange={setTrialPlanTier}>
                <SelectTrigger className="h-9 w-full" aria-labelledby="trial-plan-label">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {settings.trialPlans.map((plan) => (
                    <SelectItem key={plan.tier} value={plan.tier}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="trial-days" className="text-xs font-medium text-ink-600">
                Trial length (days)
              </label>
              <Input
                id="trial-days"
                type="number"
                min={1}
                max={MAX_TRIAL_DAYS}
                value={trialDaysText}
                aria-invalid={isTrialDaysInvalid}
                onChange={(event) => setTrialDaysText(event.target.value)}
                className="h-9"
              />
              <p className="text-[10px] text-ink-400">
                1–{MAX_TRIAL_DAYS} · default {DEFAULT_TRIAL_DAYS}
              </p>
            </div>
          </div>
          <p className="-mt-3 text-[11px] text-ink-400">
            Applies to trials started from now on. Trials already running keep their plan and end date, and the trial allowances
            below count over the whole trial.
          </p>
          {section("trial", "Free trial, over its whole length")}

          {lowered.length > 0 && (
            <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-300">
              Lowering {lowered.map((item) => `${item.scope === "free" ? "Free" : "trial"} ${item.label.toLowerCase()}`).join(", ")} applies at
              once. Nothing already made is taken away, but a Seller past the new number cannot make more until Free resets on the 1st
              or the trial ends.
            </p>
          )}
          {ruleError && <p className="text-destructive text-xs">{ruleError}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-6 py-4 max-md:px-4 max-md:py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Reset to defaults"
            className="shrink-0 text-xs text-ink-500 max-md:px-2"
            onClick={() => {
              setValues(Object.fromEntries(settings.allowances.map((item) => [keyOf(item), String(item.default)])));
              setTrialDaysText(String(DEFAULT_TRIAL_DAYS));
            }}
          >
            <RotateCcw className="size-3.5" /> <span>Reset<span className="max-md:hidden"> to defaults</span></span>
          </Button>
          <div className="flex gap-2 max-md:min-w-0 max-md:flex-1 max-md:justify-end">
            <Button type="button" variant="outline" className="max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={save} disabled={invalid.length > 0 || ruleError !== null || !trialPlan || mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
