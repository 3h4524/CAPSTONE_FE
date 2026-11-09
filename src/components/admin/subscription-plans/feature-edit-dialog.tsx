"use client";

import { useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAdminFeature } from "@/hooks/mutations/use-update-admin-feature";
import { featureFormSchema, type FeatureFormValues } from "@/schemas/feature-catalog";
import type { AdminFeature } from "@/types/feature-catalog";
import { zodResolver } from "@hookform/resolvers/zod";

type FeatureEditDialogProps = {
  feature: AdminFeature | null;
  // Existing groups, offered as suggestions so features land in the same group.
  groups: string[];
  onClose: () => void;
};

const toValues = (feature: AdminFeature | null): FeatureFormValues => ({
  label: feature?.label ?? "",
  description: feature?.description ?? "",
  group: feature?.group ?? "",
  unit: feature?.unit ?? "",
  defaultLimit: feature?.defaultLimit ?? null,
  sortOrder: feature?.sortOrder ?? 0,
  trialAvailable: feature?.trialAvailable ?? true,
  isActive: feature?.isActive ?? true,
});

// Edits how a feature is shown. The code and kind are fixed by the backend, so they are only shown.
export function FeatureEditDialog({ feature, groups, onClose }: FeatureEditDialogProps) {
  const mutation = useUpdateAdminFeature(onClose);
  const isLimit = feature?.kind === "limit";
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeatureFormValues>({ resolver: zodResolver(featureFormSchema), defaultValues: toValues(feature) });

  useEffect(() => {
    if (feature) reset(toValues(feature));
  }, [feature, reset]);

  const submit = handleSubmit((values) => {
    if (!feature) return;
    mutation.mutate({
      code: feature.code,
      input: {
        label: values.label,
        description: values.description,
        group: values.group,
        unit: isLimit && values.unit ? values.unit : null,
        defaultLimit: isLimit ? values.defaultLimit : null,
        trialAvailable: values.trialAvailable,
        isActive: values.isActive,
        sortOrder: values.sortOrder,
      },
    });
  });

  return (
    <Dialog open={feature !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-card flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6">
          <div className="text-primary bg-ink-100 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-ink-500 text-[10px] font-bold tracking-[0.16em]">EDIT FEATURE</p>
            <DialogTitle className="font-display truncate text-xl tracking-[-0.02em]">{feature?.label}</DialogTitle>
            <DialogDescription className="leading-5">
              <span className="text-ink-400 font-mono text-[11px]">{feature?.code}</span> ·{" "}
              {isLimit ? "Limit" : "On/off"}. The code and type are built in; this changes how the feature is shown and offered.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 size-10 rounded-lg hover:translate-y-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6">
            <Field label="Label" htmlFor="feature-label" error={errors.label?.message}>
              <Input id="feature-label" aria-invalid={Boolean(errors.label)} {...register("label")} />
            </Field>
            <Field label="Description" htmlFor="feature-description" error={errors.description?.message}>
              <Textarea id="feature-description" className="min-h-16" {...register("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Group" htmlFor="feature-group" error={errors.group?.message}>
                <Input id="feature-group" list="feature-groups" aria-invalid={Boolean(errors.group)} {...register("group")} />
                <datalist id="feature-groups">
                  {groups.map((group) => (
                    <option key={group} value={group} />
                  ))}
                </datalist>
              </Field>
              <Field label="Position" htmlFor="feature-sort-order" error={errors.sortOrder?.message}>
                <Input
                  id="feature-sort-order"
                  type="number"
                  min={0}
                  aria-invalid={Boolean(errors.sortOrder)}
                  {...register("sortOrder", { valueAsNumber: true })}
                />
              </Field>
            </div>
            {isLimit && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unit" htmlFor="feature-unit" error={errors.unit?.message}>
                  <Input id="feature-unit" placeholder="e.g. per day" {...register("unit")} />
                </Field>
                <Field label="Default when added to a plan" htmlFor="feature-default-limit" error={errors.defaultLimit?.message}>
                  <Input
                    id="feature-default-limit"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    aria-invalid={Boolean(errors.defaultLimit)}
                    {...register("defaultLimit", { setValueAs: (value) => (value === "" || value === null ? null : Number(value)) })}
                  />
                </Field>
              </div>
            )}
            <div className="divide-ink-100 border-ink-200 divide-y rounded-xl border">
              <SwitchRow
                control={control}
                name="isActive"
                title="Offer when adding features to a plan"
                hint="Turning this off hides it from the list. Plans that already have it keep it."
              />
              <SwitchRow
                control={control}
                name="trialAvailable"
                title="Include in the free trial"
                hint="When the trial's plan has this feature, trial users get it too."
              />
            </div>
          </div>

          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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

function SwitchRow({
  control,
  name,
  title,
  hint,
}: {
  control: ReturnType<typeof useForm<FeatureFormValues>>["control"];
  name: "isActive" | "trialAvailable";
  title: string;
  hint: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-ink-700 text-sm font-medium">{title}</p>
            <p className="text-ink-400 text-xs">{hint}</p>
          </div>
          <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={title} />
        </div>
      )}
    />
  );
}
