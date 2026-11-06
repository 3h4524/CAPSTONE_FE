"use client";

import { FeatureChooserDialog } from "@/components/admin/subscription-plans/feature-chooser-dialog";
import { useChangePlanFeatures } from "@/hooks/mutations/use-change-plan-features";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";

type AddFeatureDialogProps = {
  plan: AdminSubscriptionPlan | null;
  catalog: AdminFeature[];
  onClose: () => void;
};

// The on/off features a plan can still take: offered in the catalog and not on the plan yet.
// Limits are always part of a plan, so they are set on the card instead.
export const addableFeatures = (plan: AdminSubscriptionPlan, catalog: AdminFeature[]) =>
  catalog.filter(
    (feature) =>
      feature.kind === "flag" &&
      feature.isActive &&
      !plan.features.some((row) => row.code === feature.code && row.isEnabled)
  );

// Adds features to an existing plan; everyone on it gets them at once.
export function AddFeatureDialog({ plan, catalog, onClose }: AddFeatureDialogProps) {
  const mutation = useChangePlanFeatures(onClose);

  return (
    <FeatureChooserDialog
      open={plan !== null}
      title={`Add features to ${plan?.name ?? ""}`}
      description={`Everyone on ${plan?.name ?? "the plan"} gets them at once, current subscribers included.`}
      candidates={plan ? addableFeatures(plan, catalog) : []}
      isPending={mutation.isPending}
      onAdd={(codes) => plan && mutation.mutate({ type: "add", planId: plan.id, features: codes.map((code) => ({ code })) })}
      onClose={onClose}
    />
  );
}
