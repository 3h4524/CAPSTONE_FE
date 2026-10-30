"use client";

import { useEffect } from "react";
import { Layers, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PLAN_FEATURES } from "@/helpers/plan-features";
import { useCreateSubscriptionPlan } from "@/hooks/mutations/use-create-subscription-plan";
import { useUpdateSubscriptionPlan } from "@/hooks/mutations/use-update-subscription-plan";
import {
  subscriptionPlanFormSchema,
  type SubscriptionPlanFormValues,
} from "@/schemas/subscription-plan";
import type { AdminSubscriptionPlan, PlanFeatureInput } from "@/types/admin-subscription-plan";
import { formatVnd } from "@/utils/format-currency";
import { zodResolver } from "@hookform/resolvers/zod";

type PlanFormDialogProps = {
  open: boolean;
  plan: AdminSubscriptionPlan | null;
  // The PayOS rate, to preview what a typed USD price charges; null hides the preview.
  usdToVndRate: number | null;
  onClose: () => void;
};

// Prices are entered in USD and charged in VND at the PayOS rate, as the server rounds them.
const chargedVnd = (priceUsd: number | undefined, rate: number | null) =>
  rate !== null && typeof priceUsd === "number" && Number.isFinite(priceUsd)
    ? `≈ ${formatVnd(Math.round(priceUsd * rate))} charged via PayOS`
    : null;

type FeatureValues = NonNullable<SubscriptionPlanFormValues["features"]>;

// A new plan starts with every flag off and every limit unset (no limit).
const DEFAULT_FEATURES: FeatureValues = Object.fromEntries(
  PLAN_FEATURES.map((feature) => [feature.code, { isEnabled: feature.kind === "limit", limitValue: null }])
);

const toFeatureValues = (features: PlanFeatureInput[] | undefined): FeatureValues => ({
  ...DEFAULT_FEATURES,
  ...Object.fromEntries(
    (features ?? []).map((feature) => [feature.code, { isEnabled: feature.isEnabled, limitValue: feature.limitValue }])
  ),
});

const toFeatureInputs = (features: FeatureValues): PlanFeatureInput[] =>
  PLAN_FEATURES.map((feature) => {
    const value = features[feature.code] ?? DEFAULT_FEATURES[feature.code];
    return feature.kind === "limit"
      ? { code: feature.code, isEnabled: true, limitValue: value.limitValue }
      : { code: feature.code, isEnabled: value.isEnabled, limitValue: null };
  });

const FEATURE_GROUPS = [...new Set(PLAN_FEATURES.map((feature) => feature.group))];

const EMPTY_VALUES: SubscriptionPlanFormValues = {
  name: "",
  tier: "",
  description: "",
  monthlyPriceUsd: 0,
  annualPriceUsd: undefined,
  maxBatchSize: 100,
  maxConcurrentJobs: 1,
  maxProductsPerMonth: 1000,
  imageGenerationQuota: 500,
  videoGenerationQuota: 50,
  apiCallQuota: 10000,
  storageQuotaGb: 100,
  customApiKeysAllowed: false,
  whiteLabelExportEnabled: false,
  prioritySupport: false,
  isActive: true,
  features: DEFAULT_FEATURES,
};

const toFormValues = (plan: AdminSubscriptionPlan | null): SubscriptionPlanFormValues =>
  plan
    ? {
        name: plan.name,
        tier: plan.tier,
        description: plan.description ?? "",
        monthlyPriceUsd: plan.monthlyPriceUsd,
        annualPriceUsd: plan.annualPriceUsd ?? undefined,
        maxBatchSize: plan.maxBatchSize,
        maxConcurrentJobs: plan.maxConcurrentJobs,
        maxProductsPerMonth: plan.maxProductsPerMonth,
        imageGenerationQuota: plan.imageGenerationQuota,
        videoGenerationQuota: plan.videoGenerationQuota,
        apiCallQuota: plan.apiCallQuota,
        storageQuotaGb: plan.storageQuotaGb,
        customApiKeysAllowed: plan.customApiKeysAllowed,
        whiteLabelExportEnabled: plan.whiteLabelExportEnabled,
        prioritySupport: plan.prioritySupport,
        isActive: plan.isActive,
        features: toFeatureValues(plan.features),
      }
    : EMPTY_VALUES;

export function PlanFormDialog({ open, plan, usdToVndRate, onClose }: PlanFormDialogProps) {
  const isEditing = plan !== null;
  const createMutation = useCreateSubscriptionPlan(onClose);
  const updateMutation = useUpdateSubscriptionPlan(onClose);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscriptionPlanFormValues>({
    resolver: zodResolver(subscriptionPlanFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const [monthlyPriceUsd, annualPriceUsd] = useWatch({
    control,
    name: ["monthlyPriceUsd", "annualPriceUsd"],
  });
  const monthlyCharged = chargedVnd(monthlyPriceUsd, usdToVndRate);
  const annualCharged = chargedVnd(annualPriceUsd, usdToVndRate);

  useEffect(() => {
    if (open) {
      reset(toFormValues(plan));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  const submit = handleSubmit(({ tier, features, ...values }) => {
    const annualPriceUsd = values.annualPriceUsd ?? null;
    const description = values.description?.trim() ? values.description.trim() : null;
    const featureInputs = toFeatureInputs(features ?? DEFAULT_FEATURES);

    if (isEditing) {
      updateMutation.mutate({
        id: plan.id,
        input: { ...values, description, annualPriceUsd, features: featureInputs },
      });
      return;
    }

    createMutation.mutate({ ...values, tier, description, annualPriceUsd, features: featureInputs });
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)] duration-200"
      >
        <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6 sm:pt-7">
          <div className="text-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f6fc]">
            <Layers className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500">
              {isEditing ? "EDIT PLAN" : "NEW PLAN"}
            </p>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">
              {isEditing ? `Edit ${plan.name}` : "Create New Subscription Plan"}
            </DialogTitle>
            <DialogDescription className="leading-5">
              Configure tiers, limits, and feature access for a billing cycle.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 size-10 rounded-lg text-slate-500 hover:translate-y-0 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 px-5 py-3 sm:px-6">
              <FormSection title="Basic information">
                <Field label="Plan name" htmlFor="plan-name" error={errors.name?.message}>
                  <Input id="plan-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
                </Field>
                <Field label="Tier slug" htmlFor="plan-tier" error={errors.tier?.message}>
                  <Input
                    id="plan-tier"
                    placeholder="e.g. creator"
                    disabled={isEditing}
                    aria-invalid={Boolean(errors.tier)}
                    {...register("tier")}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monthly price (USD)" htmlFor="plan-monthly-price" error={errors.monthlyPriceUsd?.message}>
                    <Input
                      id="plan-monthly-price"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="e.g. 9.99"
                      aria-invalid={Boolean(errors.monthlyPriceUsd)}
                      {...register("monthlyPriceUsd", { valueAsNumber: true })}
                    />
                    {monthlyCharged && <p className="mt-1 text-[11px] text-slate-400">{monthlyCharged}</p>}
                  </Field>
                  <Field label="Annual price (USD)" htmlFor="plan-annual-price" error={errors.annualPriceUsd?.message}>
                    <Input
                      id="plan-annual-price"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Optional, e.g. 99.99"
                      aria-invalid={Boolean(errors.annualPriceUsd)}
                      {...register("annualPriceUsd", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      {annualCharged ?? "Leave empty to offer monthly billing only"}
                    </p>
                  </Field>
                </div>
                <Field label="Description" htmlFor="plan-description" error={errors.description?.message}>
                  <Textarea id="plan-description" className="min-h-20" {...register("description")} />
                </Field>
              </FormSection>

              {/* Plans differ by feature, not by monthly quota, so only the speed limits are set here. */}
              <FormSection title="Run limits">
                <p className="text-muted-foreground -mt-1 text-xs">
                  These set how fast a Seller can work, not how much. Use -1 for no limit.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Products per run" htmlFor="plan-max-batch-size" name="maxBatchSize" register={register} error={errors.maxBatchSize?.message} />
                  <NumberField label="Design jobs at once" htmlFor="plan-max-concurrent-jobs" name="maxConcurrentJobs" register={register} error={errors.maxConcurrentJobs?.message} />
                </div>
              </FormSection>

              {FEATURE_GROUPS.map((group) => (
                <FormSection key={group} title={group === "Safety caps" ? "Safety caps (hidden from Sellers)" : group}>
                  {PLAN_FEATURES.filter((feature) => feature.group === group).map((feature) =>
                    feature.kind === "flag" ? (
                      <Controller
                        key={feature.code}
                        name={`features.${feature.code}.isEnabled`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3.5 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{feature.label}</p>
                              <p className="text-muted-foreground text-xs">{feature.description}</p>
                            </div>
                            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label={feature.label} />
                          </div>
                        )}
                      />
                    ) : (
                      <Controller
                        key={feature.code}
                        name={`features.${feature.code}.limitValue`}
                        control={control}
                        render={({ field }) => (
                          <Field
                            label={feature.label}
                            htmlFor={`plan-feature-${feature.code}`}
                            error={errors.features?.[feature.code]?.limitValue?.message}
                          >
                            <Input
                              id={`plan-feature-${feature.code}`}
                              type="number"
                              min={0}
                              placeholder="No limit"
                              value={typeof field.value === "number" ? field.value : ""}
                              onChange={(event) =>
                                field.onChange(event.target.value === "" ? null : Number(event.target.value))
                              }
                            />
                            <p className="mt-1 text-[11px] text-slate-400">{feature.description}</p>
                          </Field>
                        )}
                      />
                    )
                  )}
                </FormSection>
              ))}

              <FormSection title="Plan settings">
                <ToggleField control={control} name="isActive" label="Plan is active" description="Visible on the public pricing page" />
                <ToggleField control={control} name="customApiKeysAllowed" label="Custom API keys" description="Allow programmatic access" />
                <ToggleField control={control} name="whiteLabelExportEnabled" label="White-label export" description="Remove APCS branding" />
                <ToggleField control={control} name="prioritySupport" label="Priority support" description="SLA guarantees" />
              </FormSection>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 pt-4 pb-6 sm:px-6">
            <Button type="button" variant="outline" className="min-h-11 border-slate-300 px-5 hover:translate-y-0 hover:border-slate-400" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11 px-5" disabled={isPending}>
              {isPending ? <Spinner aria-hidden="true" /> : null}
              {isEditing ? "Save changes" : "Create plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  htmlFor,
  name,
  register,
  error,
}: {
  label: string;
  htmlFor: string;
  name: keyof SubscriptionPlanFormValues;
  register: ReturnType<typeof useForm<SubscriptionPlanFormValues>>["register"];
  error?: string;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} error={error}>
      <Input id={htmlFor} type="number" aria-invalid={Boolean(error)} {...register(name, { valueAsNumber: true })} />
    </Field>
  );
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<SubscriptionPlanFormValues>>["control"];
  name: keyof SubscriptionPlanFormValues;
  label: string;
  description: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}
