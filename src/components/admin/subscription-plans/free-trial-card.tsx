"use client";

import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { ChevronDown, Gift, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const formatEdited = (settings: PlanSettings, t: TFunction) =>
  settings.updatedAt
    ? settings.updatedByName
      ? t("admin.plans.freeTrial.lastChangedBy", {
          date: new Date(settings.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          name: settings.updatedByName,
        })
      : t("admin.plans.freeTrial.lastChanged", {
          date: new Date(settings.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        })
    : t("admin.plans.freeTrial.shippedDefaults");

// Free and the free trial are not plans, so they sit under the plans: what each includes, and
// which plan the trial gives.
export function FreeTrialCard() {
  const { t } = useTranslation("common");
  const { data: settings, isLoading } = usePlanSettings();
  const [isEditing, setIsEditing] = useState(false);
  // A phone keeps the allowances folded, so the plans above stay within reach.
  const isPhone = useIsPhone();
  const [isAllowancesOpen, setIsAllowancesOpen] = useState(false);

  if (isLoading || !settings) {
    return <Card className="border-ink-200/80 bg-card h-48 animate-pulse rounded-2xl border" />;
  }

  const trialPlan = settings.trialPlans.find((plan) => plan.tier === settings.trialPlanTier);
  const free = settings.allowances.filter((item) => item.scope === "free");
  const trial = settings.allowances.filter((item) => item.scope === "trial");
  const changed = settings.allowances.filter((item) => item.limit !== item.default).length;
  const freeByCode = new Map(free.map((item) => [item.code, item.limit]));
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <Card className="border-ink-200 bg-card gap-0 overflow-hidden rounded-2xl border p-0 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 max-md:flex-nowrap max-md:px-4 max-md:pt-4">
        <div className="min-w-0">
          <h3 className="text-ink-900 text-base font-semibold">{t("admin.plans.freeTrial.title")}</h3>
          <p className="text-ink-500 text-xs">{t("admin.plans.freeTrial.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-ink-400 hidden text-[11px] sm:inline">{formatEdited(settings, t)}</span>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(true)}>
            <Pencil className="size-3.5" /> {t("admin.plans.shared.edit")}
          </Button>
        </div>
      </div>

      {/* The figures to check at a glance before opening the editor. */}
      <div className="divide-ink-100 bg-ink-50 mx-6 mt-4 grid grid-cols-2 rounded-xl py-2.5 text-center max-md:mx-4 sm:grid-cols-4 sm:divide-x">
        <Figure label={t("admin.plans.freeTrial.trialsRunning")} value={settings.activeTrials.toLocaleString()} />
        <Figure label={t("admin.plans.freeTrial.trialGives")} value={trialPlan?.name ?? settings.trialPlanTier} tone={trialPlan ? undefined : "warning"} />
        <Figure label={t("admin.plans.freeTrial.trialLength")} value={t("admin.plans.freeTrial.trialDaysValue", { days: settings.trialDays })} />
        <Figure
          label={t("admin.plans.freeTrial.changedFromDefaults")}
          value={t("admin.plans.freeTrial.changedOfTotal", { changed, total: settings.allowances.length })}
          tone={changed > 0 ? "accent" : undefined}
        />
      </div>

      {isPhone && !isAllowancesOpen && !trialPlan && (
        <p role="alert" className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t("admin.plans.freeTrial.planNotOnSale")}
        </p>
      )}
      {isPhone && (
        <button
          type="button"
          aria-expanded={isAllowancesOpen}
          className="text-ink-600 mx-4 mt-1 mb-2 flex min-h-11 items-center gap-1 text-xs font-semibold"
          onClick={() => setIsAllowancesOpen((open) => !open)}
        >
          <ChevronDown className={cn("size-3.5 transition-transform", isAllowancesOpen && "rotate-180")} aria-hidden="true" />
          {isAllowancesOpen ? t("admin.plans.freeTrial.hideAllowances") : t("admin.plans.freeTrial.showAllowances")}
        </button>
      )}
      {(!isPhone || isAllowancesOpen) && (
      <div className="grid grid-cols-1 gap-4 p-6 max-md:p-4 max-md:pt-0 md:grid-cols-2">
        <Panel
          icon={<Gift className="size-4" />}
          title={t("admin.plans.freeTrial.freeScope")}
          subtitle={t("admin.plans.freeTrial.freeSubtitle", { date: nextReset })}
          items={free}
        />
        <Panel
          icon={<Sparkles className="size-4" />}
          title={t("admin.plans.freeTrial.trialPanelTitle", { plan: trialPlan?.name ?? settings.trialPlanTier })}
          subtitle={t("admin.plans.freeTrial.trialSubtitle", { days: settings.trialDays, count: settings.activeTrials.toLocaleString() })}
          warning={trialPlan ? null : t("admin.plans.freeTrial.planNotOnSale")}
          items={trial}
          // How the trial compares with Free and with the plan it gives, so a value that is off stands out.
          hintFor={(item) => {
            if (item.code === "products_per_run" && trialPlan)
              return trialPlan.maxBatchSize < 0
                ? t("admin.plans.freeTrial.planNoLimit", { plan: trialPlan.name })
                : t("admin.plans.freeTrial.planAllows", { plan: trialPlan.name, count: trialPlan.maxBatchSize });
            const monthly = freeByCode.get(item.code);
            return monthly ? t("admin.plans.freeTrial.timesFreeMonth", { times: Math.round((item.limit / monthly) * 10) / 10 }) : null;
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
      <p className="text-ink-400 text-[10px]">{label}</p>
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
  const { t } = useTranslation("common");
  return (
    <div className="border-ink-200 rounded-2xl border p-4">
      <div className="text-ink-900 flex items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-ink-400 mt-1 text-[11px]">{subtitle}</p>
      {warning && <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{warning}</p>}
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const isChanged = item.limit !== item.default;
          const hint = hintFor?.(item);
          return (
            <li
              key={keyOf(item)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                isChanged ? "border-violet-200 bg-violet-50/50 dark:border-violet-500/30 dark:bg-violet-500/10" : "border-ink-100 bg-ink-50/60"
              )}
            >
              <span className="text-ink-500 block truncate">{item.label}</span>
              <span className="text-ink-900 text-base font-bold tabular-nums">{item.limit.toLocaleString()}</span>
              {isChanged && (
                <span className="ml-1 text-[10px] text-violet-700 dark:text-violet-300">
                  <span aria-hidden="true">{item.limit > item.default ? "▲ " : "▼ "}</span>
                  <span>{t("admin.plans.freeTrial.defaultValue", { defaultValue: item.default })}</span>
                </span>
              )}
              {hint && <span className="text-ink-400 block truncate text-[10px]">{hint}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlanSettingsDialog({ open, settings, onClose }: { open: boolean; settings: PlanSettings; onClose: () => void }) {
  const { t } = useTranslation("common");
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
    ? t("admin.plans.freeTrial.ruleTrialDays", { max: MAX_TRIAL_DAYS })
    : perRun < 1
      ? t("admin.plans.freeTrial.rulePerRunMin")
      : perRun > products
        ? t("admin.plans.freeTrial.rulePerRunMaxProducts")
        : trialPlan && trialPlan.maxBatchSize >= 0 && perRun > trialPlan.maxBatchSize
          ? t("admin.plans.freeTrial.rulePerRunMaxPlan", { plan: trialPlan.name, count: trialPlan.maxBatchSize })
          : null;

  const save = () =>
    mutation.mutate({
      trialPlanTier,
      trialDays,
      allowances: parsed.map((item) => ({ scope: item.scope, code: item.code, limit: item.value })),
    });

  const section = (scope: AllowanceScope, title: string) => (
    <div className="space-y-2">
      <p className="text-ink-700 text-sm font-semibold">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {parsed
          .filter((item) => item.scope === scope)
          .map((item) => {
            const id = `allowance-${scope}-${item.code}`;
            const isInvalid = invalid.includes(item);
            return (
              <div key={id} className="space-y-1">
                <label htmlFor={id} className="text-ink-600 text-xs font-medium">
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
                <p className="text-ink-400 text-[10px]">{t("admin.plans.freeTrial.defaultLabel", { defaultValue: item.default })}</p>
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
        className="bg-card flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 p-0"
      >
        <DialogHeader className="relative px-6 pt-6 pr-16 pb-3 text-left">
          <DialogTitle className="font-display text-xl tracking-[-0.02em]">{t("admin.plans.freeTrial.title")}</DialogTitle>
          <DialogDescription>{t("admin.plans.freeTrial.dialogDescription")}</DialogDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 size-10 rounded-lg"
            onClick={onClose}
            aria-label={t("admin.plans.shared.close")}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-3">
          {section("free", t("admin.plans.freeTrial.freeSection"))}
          <div className="grid gap-3 sm:grid-cols-[16rem_10rem]">
            <div className="space-y-1">
              <label className="text-ink-600 text-xs font-medium" id="trial-plan-label">
                {t("admin.plans.freeTrial.trialGivesLabel")}
              </label>
              <Select value={trialPlanTier} onValueChange={setTrialPlanTier}>
                <SelectTrigger className="h-9 w-full" aria-labelledby="trial-plan-label">
                  <SelectValue placeholder={t("admin.plans.freeTrial.choosePlan")} />
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
              <label htmlFor="trial-days" className="text-ink-600 text-xs font-medium">
                {t("admin.plans.freeTrial.trialLengthDays")}
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
              <p className="text-ink-400 text-[10px]">
                {t("admin.plans.freeTrial.trialLengthRange", { max: MAX_TRIAL_DAYS, defaultValue: DEFAULT_TRIAL_DAYS })}
              </p>
            </div>
          </div>
          <p className="text-ink-400 -mt-3 text-[11px]">
            {t("admin.plans.freeTrial.trialNote")}
          </p>
          {section("trial", t("admin.plans.freeTrial.trialSection"))}

          {lowered.length > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
              {t("admin.plans.freeTrial.loweringApplied", {
                items: lowered.map((item) => `${item.scope === "free" ? t("admin.plans.freeTrial.freeScope") : t("admin.plans.freeTrial.trialScope")} ${item.label.toLowerCase()}`).join(", "),
              })}
            </p>
          )}
          {ruleError && <p className="text-destructive text-xs">{ruleError}</p>}
        </div>

        <div className="border-ink-100 flex items-center justify-between gap-2 border-t px-6 py-4 max-md:px-4 max-md:py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t("admin.plans.freeTrial.resetToDefaults")}
            className="text-ink-500 shrink-0 text-xs max-md:px-2"
            onClick={() => {
              setValues(Object.fromEntries(settings.allowances.map((item) => [keyOf(item), String(item.default)])));
              setTrialDaysText(String(DEFAULT_TRIAL_DAYS));
            }}
          >
            <RotateCcw className="size-3.5" /> <span>{t("admin.plans.freeTrial.reset")}<span className="max-md:hidden">{t("admin.plans.freeTrial.resetSuffix")}</span></span>
          </Button>
          <div className="flex gap-2 max-md:min-w-0 max-md:flex-1 max-md:justify-end">
            <Button type="button" variant="outline" className="max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={onClose} disabled={mutation.isPending}>
              {t("admin.plans.shared.cancel")}
            </Button>
            <Button type="button" className="max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={save} disabled={invalid.length > 0 || ruleError !== null || !trialPlan || mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              {t("admin.plans.freeTrial.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
