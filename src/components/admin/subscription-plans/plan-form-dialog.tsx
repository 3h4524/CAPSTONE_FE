"use client";

import { useEffect } from "react";
import { Layers, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

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
import {
  subscriptionPlanFormSchema,
  type SubscriptionPlanFormValues,
} from "@/schemas/subscription-plan";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { zodResolver } from "@hookform/resolvers/zod";

type PlanFormDialogProps = {
  open: boolean;
  plan: AdminSubscriptionPlan | null;
  onClose: () => void;
};

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
  sortOrder: 0,
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
        sortOrder: plan.sortOrder,
      }
    : EMPTY_VALUES;

export function PlanFormDialog({ open, plan, onClose }: PlanFormDialogProps) {
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

  useEffect(() => {
    if (open) {
      reset(toFormValues(plan));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  const submit = handleSubmit(({ tier, ...values }) => {
    const annualPriceUsd = values.annualPriceUsd ?? null;
    const description = values.description?.trim() ? values.description.trim() : null;

    if (isEditing) {
      updateMutation.mutate({
        id: plan.id,
        input: { ...values, description, annualPriceUsd },
      });
      return;
    }

    createMutation.mutate({ ...values, tier, description, annualPriceUsd });
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tier slug" htmlFor="plan-tier" error={errors.tier?.message}>
                    <Input
                      id="plan-tier"
                      placeholder="e.g. creator"
                      disabled={isEditing}
                      aria-invalid={Boolean(errors.tier)}
                      {...register("tier")}
                    />
                  </Field>
                  <Field label="Sort order" htmlFor="plan-sort-order" error={errors.sortOrder?.message}>
                    <Input
                      id="plan-sort-order"
                      type="number"
                      aria-invalid={Boolean(errors.sortOrder)}
                      {...register("sortOrder", { valueAsNumber: true })}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Monthly price (USD)" htmlFor="plan-monthly-price" error={errors.monthlyPriceUsd?.message}>
                    <Input
                      id="plan-monthly-price"
                      type="number"
                      step="0.01"
                      aria-invalid={Boolean(errors.monthlyPriceUsd)}
                      {...register("monthlyPriceUsd", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Annual price (USD)" htmlFor="plan-annual-price" error={errors.annualPriceUsd?.message}>
                    <Input
                      id="plan-annual-price"
                      type="number"
                      step="0.01"
                      placeholder="Optional"
                      aria-invalid={Boolean(errors.annualPriceUsd)}
                      {...register("annualPriceUsd", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                    />
                  </Field>
                </div>
                <Field label="Description" htmlFor="plan-description" error={errors.description?.message}>
                  <Textarea id="plan-description" className="min-h-20" {...register("description")} />
                </Field>
              </FormSection>

              <FormSection title="Usage limits">
                <p className="text-muted-foreground -mt-1 text-xs">Use -1 for unlimited.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Max batch size" htmlFor="plan-max-batch-size" name="maxBatchSize" register={register} error={errors.maxBatchSize?.message} />
                  <NumberField label="Concurrent jobs" htmlFor="plan-max-concurrent-jobs" name="maxConcurrentJobs" register={register} error={errors.maxConcurrentJobs?.message} />
                  <NumberField label="Products / month" htmlFor="plan-max-products" name="maxProductsPerMonth" register={register} error={errors.maxProductsPerMonth?.message} />
                  <NumberField label="API calls / month" htmlFor="plan-api-calls" name="apiCallQuota" register={register} error={errors.apiCallQuota?.message} />
                  <NumberField label="Images / month" htmlFor="plan-images" name="imageGenerationQuota" register={register} error={errors.imageGenerationQuota?.message} />
                  <NumberField label="Videos / month" htmlFor="plan-videos" name="videoGenerationQuota" register={register} error={errors.videoGenerationQuota?.message} />
                  <NumberField label="Storage (GB)" htmlFor="plan-storage" name="storageQuotaGb" register={register} error={errors.storageQuotaGb?.message} />
                </div>
              </FormSection>

              <FormSection title="Features & permissions">
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
