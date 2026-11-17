"use client";

import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { Layers, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
import { usdToVnd, vndToUsd } from "@/helpers/plan-price";
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
  // The PayOS rate, when a plan exists to read it from; null switches the price inputs to USD.
  usdToVndRate: number | null;
  // The plans a new plan can copy its features from.
  plans: AdminSubscriptionPlan[];
  onClose: () => void;
};

const chargedVnd = (priceUsd: number | undefined, rate: number | null, t: TFunction) =>
  rate !== null && typeof priceUsd === "number" && Number.isFinite(priceUsd)
    ? t("admin.plans.form.chargedViaPayos", { amount: formatVnd(usdToVnd(priceUsd, rate)) })
    : null;

// The old quota columns and the API key, white-label and priority support switches are kept as they
// are: nothing checks them any more, and what a plan includes is set with features.
const EMPTY_VALUES: SubscriptionPlanFormValues = {
  name: "",
  tier: "",
  description: "",
  monthlyPriceUsd: 0,
  annualPriceUsd: undefined,
  monthlyPriceVnd: 0,
  annualPriceVnd: undefined,
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
        monthlyPriceVnd: plan.monthlyPriceVnd,
        annualPriceVnd: plan.annualPriceVnd ?? undefined,
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
  const { t } = useTranslation("common");
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
    setValue,
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
  const monthlyCharged = chargedVnd(monthlyPriceUsd, usdToVndRate, t);
  const annualCharged = chargedVnd(annualPriceUsd, usdToVndRate, t);

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
  const submit = handleSubmit(({ tier, features, monthlyPriceVnd: _monthlyPriceVnd, annualPriceVnd: _annualPriceVnd, ...values }) => {
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
        className="bg-card flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[720px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)] duration-200"
      >
        <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6 sm:pt-7">
          <div className="text-primary bg-ink-100 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Layers className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-ink-500 text-[10px] font-bold tracking-[0.16em]">
              {isEditing ? t("admin.plans.form.editPlanEyebrow") : t("admin.plans.form.newPlanEyebrow")}
            </p>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">
              {isEditing ? t("admin.plans.form.editPlanTitle", { name: plan.name }) : t("admin.plans.form.createPlanTitle")}
            </DialogTitle>
            <DialogDescription className="leading-5">
              {t("admin.plans.form.description")}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 size-10 rounded-lg hover:translate-y-0"
            onClick={onClose}
            aria-label={t("admin.plans.shared.close")}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-6 px-5 py-3 sm:px-6">
              <FormSection title={t("admin.plans.form.sectionBasic")}>
                <Field label={t("admin.plans.form.planName")} htmlFor="plan-name" error={errors.name?.message}>
                  <Input id="plan-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
                </Field>
                <Field label={t("admin.plans.shared.tierSlug")} htmlFor="plan-tier" error={errors.tier?.message}>
                  <Input
                    id="plan-tier"
                    placeholder={t("admin.plans.form.tierPlaceholder")}
                    disabled={isEditing}
                    aria-invalid={Boolean(errors.tier)}
                    {...register("tier")}
                  />
                </Field>
                {usdToVndRate !== null ? (
                  <VndPriceSection
                    rate={usdToVndRate}
                    register={register}
                    setValue={setValue}
                    isEditing={isEditing}
                    monthlyError={errors.monthlyPriceUsd?.message}
                    annualError={errors.annualPriceUsd?.message}
                    monthlyInvalid={Boolean(errors.monthlyPriceUsd)}
                    annualInvalid={Boolean(errors.annualPriceUsd)}
                    monthlyCharged={monthlyCharged}
                    annualCharged={annualCharged}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("admin.plans.form.monthlyPriceUsd")} htmlFor="plan-monthly-price" error={errors.monthlyPriceUsd?.message}>
                      <Input
                        id="plan-monthly-price"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder={t("admin.plans.form.monthlyPlaceholder")}
                        aria-invalid={Boolean(errors.monthlyPriceUsd)}
                        {...register("monthlyPriceUsd", { valueAsNumber: true })}
                      />
                      {monthlyCharged && <p className="text-ink-400 mt-1 text-[11px]">{monthlyCharged}</p>}
                    </Field>
                    {isEditing && (
                      <p className="text-ink-400 text-[11px] leading-relaxed sm:col-span-2">
                        {t("admin.plans.form.priceAppliesNote")}
                      </p>
                    )}
                    <Field label={t("admin.plans.form.annualPriceUsd")} htmlFor="plan-annual-price" error={errors.annualPriceUsd?.message}>
                      <Input
                        id="plan-annual-price"
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder={t("admin.plans.form.annualPlaceholder")}
                        aria-invalid={Boolean(errors.annualPriceUsd)}
                        {...register("annualPriceUsd", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                      />
                      <p className="text-ink-400 mt-1 text-[11px]">
                        {annualCharged ?? t("admin.plans.form.monthlyBillingOnly")}
                      </p>
                    </Field>
                  </div>
                )}
                <Field label={t("admin.plans.shared.description")} htmlFor="plan-description" error={errors.description?.message}>
                  <Textarea id="plan-description" className="min-h-20" {...register("description")} />
                </Field>
              </FormSection>

              {/* Plans differ by feature, not by monthly quota, so only the speed limits are set here. */}
              <FormSection title={t("admin.plans.form.runLimits")}>
                <p className="text-muted-foreground -mt-1 text-xs">
                  {t("admin.plans.form.runLimitsHint")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label={t("admin.plans.compare.productsPerRun")} htmlFor="plan-max-batch-size" name="maxBatchSize" register={register} error={errors.maxBatchSize?.message} />
                  <NumberField label={t("admin.plans.compare.designJobsAtOnce")} htmlFor="plan-max-concurrent-jobs" name="maxConcurrentJobs" register={register} error={errors.maxConcurrentJobs?.message} />
                </div>
              </FormSection>

              {isEditing ? (
                <p className="bg-ink-50 text-ink-500 rounded-xl px-4 py-3 text-xs leading-relaxed">
                  {t("admin.plans.form.featuresOnCardNote")}
                </p>
              ) : (
                <FormSection title={t("admin.plans.form.featuresSection")}>
                  <PlanFeaturePicker catalog={catalog} plans={plans} picks={picks} onChange={setPicks} />
                  {!picksValid && (
                    <p role="alert" className="text-destructive text-xs">
                      {t("admin.plans.form.limitInvalid")}
                    </p>
                  )}
                </FormSection>
              )}

              <FormSection title={t("admin.plans.form.sale")}>
                <ToggleField
                  control={control}
                  name="isActive"
                  label={t("admin.plans.form.onSale")}
                  description={isEditing ? t("admin.plans.form.onSaleEditing") : t("admin.plans.form.onSaleCreating")}
                />
              </FormSection>
            </div>
          </div>

          <div className="border-ink-100 bg-card flex shrink-0 justify-end gap-2 border-t px-5 pt-4 pb-6 sm:px-6">
            <Button type="button" variant="outline" className="border-ink-300 hover:border-ink-400 min-h-11 px-5 hover:translate-y-0" onClick={onClose} disabled={isPending}>
              {t("admin.plans.shared.cancel")}
            </Button>
            <Button type="submit" className="min-h-11 px-5" disabled={isPending}>
              {isPending ? <Spinner aria-hidden="true" /> : null}
              {isEditing ? t("admin.plans.shared.saveChanges") : t("admin.plans.form.createPlan")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VndPriceSection({
  rate,
  register,
  setValue,
  isEditing,
  monthlyError,
  annualError,
  monthlyInvalid,
  annualInvalid,
  monthlyCharged,
  annualCharged,
}: {
  rate: number;
  register: ReturnType<typeof useForm<SubscriptionPlanFormValues>>["register"];
  setValue: ReturnType<typeof useForm<SubscriptionPlanFormValues>>["setValue"];
  isEditing: boolean;
  monthlyError?: string;
  annualError?: string;
  monthlyInvalid: boolean;
  annualInvalid: boolean;
  monthlyCharged: string | null;
  annualCharged: string | null;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("admin.plans.form.monthlyPriceVnd")} htmlFor="plan-monthly-price" error={monthlyError}>
        <Input
          id="plan-monthly-price"
          type="number"
          step="1"
          min={0}
          placeholder={t("admin.plans.form.monthlyVndPlaceholder")}
          aria-invalid={monthlyInvalid}
          {...register("monthlyPriceVnd", {
            valueAsNumber: true,
            onChange: (event) => {
              const value = event.target.value;
              const vnd = value === "" ? Number.NaN : Number(value);
              setValue("monthlyPriceUsd", Number.isNaN(vnd) ? Number.NaN : vndToUsd(vnd, rate), {
                shouldValidate: true,
                shouldDirty: true,
              });
            },
          })}
        />
        {monthlyCharged && <p className="text-ink-400 mt-1 text-[11px]">{monthlyCharged}</p>}
      </Field>
      {isEditing && (
        <p className="text-ink-400 text-[11px] leading-relaxed sm:col-span-2">
          {t("admin.plans.form.priceAppliesNote")}
        </p>
      )}
      <Field label={t("admin.plans.form.annualPriceVnd")} htmlFor="plan-annual-price" error={annualError}>
        <Input
          id="plan-annual-price"
          type="number"
          step="1"
          min={0}
          placeholder={t("admin.plans.form.annualVndPlaceholder")}
          aria-invalid={annualInvalid}
          {...register("annualPriceVnd", {
            setValueAs: (v) => (v === "" ? undefined : Number(v)),
            onChange: (event) => {
              const value = event.target.value;
              setValue("annualPriceUsd", value === "" ? undefined : vndToUsd(Number(value), rate), {
                shouldValidate: true,
                shouldDirty: true,
              });
            },
          })}
        />
        <p className="text-ink-400 mt-1 text-[11px]">
          {annualCharged ?? t("admin.plans.form.monthlyBillingOnly")}
        </p>
      </Field>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-ink-700 text-sm font-semibold">{title}</p>
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
      <label htmlFor={htmlFor} className="text-ink-700 text-sm font-medium">
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
        <div className="border-ink-200 flex items-center justify-between gap-4 rounded-lg border px-3.5 py-2.5">
          <div>
            <p className="text-ink-700 text-sm font-medium">{label}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
        </div>
      )}
    />
  );
}
