"use client";

import { useEffect, useState } from "react";
import { Layers, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  type FeaturePicks,
  initialPicks,
  picksAreValid,
  PlanFeaturePicker,
  toFeatureInputs,
} from "@/components/admin/subscription-plans/plan-feature-picker";
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
import { useCreateSubscriptionPlan } from "@/hooks/mutations/use-create-subscription-plan";
import { useUpdateSubscriptionPlan } from "@/hooks/mutations/use-update-subscription-plan";
import { useAdminFeatures } from "@/hooks/queries/use-admin-features";
import {
  subscriptionPlanFormSchema,
  type SubscriptionPlanFormValues,
} from "@/schemas/subscription-plan";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { formatVnd } from "@/utils/format-currency";
import { zodResolver } from "@hookform/resolvers/zod";

type PlanFormDialogProps = {
  open: boolean;
  plan: AdminSubscriptionPlan | null;
  // The PayOS rate, to preview what a typed USD price charges; null hides the preview.
  usdToVndRate: number | null;
  // The plans a new plan can copy its features from.
  plans: AdminSubscriptionPlan[];
  onClose: () => void;
};

// Prices are entered in USD and charged in VND at the PayOS rate, as the server rounds them.
const chargedVnd = (priceUsd: number | undefined, rate: number | null) =>
  rate !== null && typeof priceUsd === "number" && Number.isFinite(priceUsd)
    ? `≈ ${formatVnd(Math.round(priceUsd * rate))} charged via PayOS`
    : null;

// The old quota columns and the API key, white-label and priority support switches are kept as they
// are: nothing checks them any more, and what a plan includes is set with features.
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
  // A new plan waits off sale until the Admin has checked it.
  isActive: false,
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
      }
    : EMPTY_VALUES;

export function PlanFormDialog({ open, plan, usdToVndRate, plans, onClose }: PlanFormDialogProps) {
  const isEditing = plan !== null;
  // A new plan's features come from the catalog, as the Admin set it up.
  const { data: catalog = [] } = useAdminFeatures();
  const [picks, setPicks] = useState<FeaturePicks>({});
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

  // A new plan starts from the basics; the catalog may load after the dialog opens.
  const catalogSize = catalog.length;
  useEffect(() => {
    if (open && !plan) setPicks(initialPicks(catalog));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan, catalogSize]);

  const picksValid = picksAreValid(picks);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const submit = handleSubmit(({ tier, features, ...values }) => {
    const annualPriceUsd = values.annualPriceUsd ?? null;
    const description = values.description?.trim() ? values.description.trim() : null;

    if (isEditing) {
      updateMutation.mutate({
        id: plan.id,
        // Features are changed on the plan card, where current subscribers keep what they had.
        input: { ...values, description, annualPriceUsd },
      });
      return;
    }

    if (!picksValid) return;
    createMutation.mutate({ ...values, tier, description, annualPriceUsd, features: toFeatureInputs(catalog, picks) });
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
                  {isEditing && (
                    <p className="text-[11px] leading-relaxed text-slate-400 sm:col-span-2">
                      A new price applies to new purchases and renewals; a period already paid keeps its price.
                    </p>
                  )}
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

              {isEditing ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
                  Features and limits are changed on the plan card, so current subscribers keep what they paid for until
                  their period ends.
                </p>
              ) : (
                <FormSection title="Features">
                  <PlanFeaturePicker catalog={catalog} plans={plans} picks={picks} onChange={setPicks} />
                  {!picksValid && (
                    <p role="alert" className="text-destructive text-xs">
                      Each limit must be a whole number from 0 to 10,000, or empty for no limit.
                    </p>
                  )}
                </FormSection>
              )}

              <FormSection title="Sale">
                <ToggleField
                  control={control}
                  name="isActive"
                  label="On sale"
                  description={
                    isEditing
                      ? "Sellers can buy it. Taking it off sale keeps current subscribers on it."
                      : "Leave off until you have checked the new plan; Sellers cannot buy it until then."
                  }
                />
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
