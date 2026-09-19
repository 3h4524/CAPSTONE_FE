"use client";

import { ShieldAlert, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";

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
import { zodResolver } from "@hookform/resolvers/zod";

type DeletePlanDialogProps = {
  open: boolean;
  plan: AdminSubscriptionPlan | null;
  onClose: () => void;
};

export function DeletePlanDialog({ open, plan, onClose }: DeletePlanDialogProps) {
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

  const priceLabel = `$${plan.monthlyPriceUsd.toFixed(2)}/mo`;

  if (!plan.canDelete) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100%-20px)] max-w-[480px] rounded-[24px] p-0">
          <DialogHeader className="items-start gap-3 px-6 pt-7 pb-2 text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert className="size-[18px]" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-xl tracking-[-0.02em]">
              Can&apos;t delete {plan.name}
            </DialogTitle>
            <DialogDescription className="leading-5 text-slate-600">
              One or more Sellers have subscribed to this plan at some point, so it can&apos;t be
              permanently deleted. If you want to hide it from new Sellers instead, open{" "}
              <strong>Edit</strong> and turn off <strong>&quot;Plan is active&quot;</strong> —
              existing subscribers keep full access either way.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end px-6 pb-6">
            <Button type="button" onClick={onClose}>
              Got it
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TriangleAlert className="size-[18px]" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-xl tracking-[-0.02em]">
            Delete Subscription Plan?
          </DialogTitle>
          <DialogDescription className="leading-5 text-slate-600">
            You are about to permanently delete <strong>{plan.name}</strong> ({priceLabel}). This
            plan has no subscribers, so it will be removed entirely. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label htmlFor="delete-plan-reason" className="text-sm font-medium text-slate-700">
              Reason for deleting this plan
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
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner aria-hidden="true" /> : null}
              Permanently delete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
