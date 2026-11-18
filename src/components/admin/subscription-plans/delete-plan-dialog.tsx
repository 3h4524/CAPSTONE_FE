"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteSubscriptionPlan } from "@/hooks/mutations/use-delete-subscription-plan";
import { deletePlanFormSchema,type DeletePlanFormValues } from "@/schemas/subscription-plan";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { formatVnd } from "@/utils/format-currency";
import { zodResolver } from "@hookform/resolvers/zod";

type DeletePlanDialogProps = {
  open: boolean;
  plan: AdminSubscriptionPlan | null;
  onClose: () => void;
};

export function DeletePlanDialog({ open, plan, onClose }: DeletePlanDialogProps) {
  const { t } = useTranslation("common");
  const mutation = useDeleteSubscriptionPlan(onClose);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeletePlanFormValues>({
    resolver: zodResolver(deletePlanFormSchema),
    defaultValues: { reason: "" },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset({ reason: "" });
      onClose();
    }
  };

  if (!plan) {
    return null;
  }

  const submit = handleSubmit((values) => {
    mutation.mutate({ id: plan.id, reason: values.reason });
  });

  const priceLabel = t("admin.plans.shared.pricePerMonth", { amount: formatVnd(plan.monthlyPriceVnd) });

  if (!plan.canDelete) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100%-20px)] max-w-[480px] rounded-[24px] p-0">
          <DialogHeader className="items-start gap-3 px-6 pt-7 pb-2 text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <ShieldAlert className="size-[18px]" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">
              {t("admin.plans.deletePlan.cannotDeleteTitle", { name: plan.name })}
            </DialogTitle>
            <DialogDescription className="text-ink-600 leading-5">
              {t("admin.plans.deletePlan.cannotDeleteDescriptionLead")}{" "}
              <strong>{t("admin.plans.shared.edit")}</strong>{" "}
              {t("admin.plans.deletePlan.cannotDeleteDescriptionTurnOff")}{" "}
              <strong>&quot;{t("admin.plans.deletePlan.planIsActive")}&quot;</strong>{" "}
              {t("admin.plans.deletePlan.cannotDeleteDescriptionKeep")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end px-6 pb-6">
            <Button type="button" onClick={onClose}>
              {t("admin.plans.deletePlan.gotIt")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-20px)] max-w-[480px] rounded-[24px] p-0">
        <DialogHeader className="items-start gap-3 px-6 pt-7 pb-2 text-left">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <TriangleAlert className="size-[18px]" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-xl tracking-[-0.02em]">
            {t("admin.plans.deletePlan.title")}
          </DialogTitle>
          <DialogDescription className="text-ink-600 leading-5">
            {t("admin.plans.deletePlan.descriptionBefore")} <strong>{plan.name}</strong> ({priceLabel}).{" "}
            {t("admin.plans.deletePlan.descriptionAfter")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label htmlFor="delete-plan-reason" className="text-ink-700 text-sm font-medium">
              {t("admin.plans.deletePlan.reasonLabel")}
            </label>
            <Textarea
              id="delete-plan-reason"
              className="min-h-20"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason ? (
              <p role="alert" className="text-destructive text-xs">
                {errors.reason.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              {t("admin.plans.shared.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner aria-hidden="true" /> : null}
              {t("admin.plans.deletePlan.permanentlyDelete")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
