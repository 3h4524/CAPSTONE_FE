"use client";

import { adminFeatureKeys } from "@/api/admin-features";
import { adminSubscriptionPlanKeys, changePlanFeatures, type PlanFeatureAction } from "@/api/admin-subscription-plans";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import type { PlanFeatureChange, PlanFeatureChanges } from "@/types/admin-subscription-plan";
import { useQueryClient } from "@tanstack/react-query";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const formatSetting = (change: PlanFeatureChange) =>
  change.after.limitValue === null ? "no limit" : change.after.limitValue.toLocaleString();

// What the change did, in one line for the toast.
export const describeChanges = (result: PlanFeatureChanges, action: PlanFeatureAction) => {
  const [first] = result.changes;
  const kept = result.changes.find((change) => change.keptBy > 0);
  const keptNote = kept
    ? ` ${kept.keptBy.toLocaleString()} current subscriber${kept.keptBy === 1 ? " keeps" : "s keep"} the old setting until their period ends (latest ${formatDate(kept.keptUntil!)}).`
    : "";
  if (action.type === "remove") return `${first.label} removed from ${result.planName}.${keptNote}`;
  if (action.type === "limit") return `${first.label} on ${result.planName} set to ${formatSetting(first)}.${keptNote}`;
  return `Added ${result.changes.map((change) => change.label).join(", ")} to ${result.planName}.`;
};

// The changes that put every feature back as it was before.
export const undoActions = (result: PlanFeatureChanges): PlanFeatureAction[] =>
  result.changes.flatMap((change): PlanFeatureAction[] => {
    if (change.kind === "limit") {
      return change.before.limitValue === change.after.limitValue && change.before.isEnabled === change.after.isEnabled
        ? []
        : [{ type: "limit", planId: result.planId, code: change.code, limitValue: change.before.limitValue }];
    }
    if (change.before.isEnabled === change.after.isEnabled) return [];
    return change.before.isEnabled
      ? [{ type: "add", planId: result.planId, features: [{ code: change.code }] }]
      : [{ type: "remove", planId: result.planId, code: change.code }];
  });

// Adds, removes or sets a plan feature, saving at once, and offers Undo in the toast.
export const useChangePlanFeatures = (onChanged?: () => void) => {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminSubscriptionPlanKeys.all }),
      queryClient.invalidateQueries({ queryKey: adminFeatureKeys.all }),
    ]);
  };

  const undo = async (result: PlanFeatureChanges) => {
    try {
      for (const action of undoActions(result)) await changePlanFeatures(action);
      showToast("success", `Undone. ${result.planName} is back as it was.`);
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      await refresh();
    }
  };

  return useMutation({
    mutationFn: changePlanFeatures,
    onSuccess: async (result, action) => {
      await refresh();
      onChanged?.();
      showToast("success", describeChanges(result, action), {
        duration: 8000,
        action: undoActions(result).length > 0 ? { label: "Undo", onClick: () => void undo(result) } : undefined,
      });
    },
  });
};
