import { api } from "@/api/client";
import type { PagedResult } from "@/types/admin";
import type {
  AdminSubscriptionPlan,
  CreateSubscriptionPlanInput,
  DuplicatedPlan,
  PlanFeatureChanges,
  PlanFeatureImpact,
  PlanHistoryAction,
  PlanHistoryEntry,
  UpdateSubscriptionPlanInput,
} from "@/types/admin-subscription-plan";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { PlanInsights } from "@/types/plan-insights";

export const adminSubscriptionPlanKeys = {
  all: ["admin", "subscription-plans"] as const,
  detail: (id: string) => [...adminSubscriptionPlanKeys.all, id] as const,
  insights: () => [...adminSubscriptionPlanKeys.all, "insights"] as const,
  aiReview: () => [...adminSubscriptionPlanKeys.all, "ai-review"] as const,
  history: (pageNumber: number, pageSize: number, action?: PlanHistoryAction) =>
    [...adminSubscriptionPlanKeys.all, "history", pageNumber, pageSize, action] as const,
  featureImpact: (planId: string, code: string, limitValue?: number | null) =>
    [...adminSubscriptionPlanKeys.all, planId, "impact", code, limitValue === undefined ? "remove" : (limitValue ?? "none")] as const,
};

export const getAdminSubscriptionPlans = async (): Promise<AdminSubscriptionPlan[]> => {
  const { data } = await api.get<AdminSubscriptionPlan[]>("/api/admin/subscription-plans");
  return data;
};

export const getAdminSubscriptionPlan = async (id: string): Promise<AdminSubscriptionPlan> => {
  const { data } = await api.get<AdminSubscriptionPlan>(`/api/admin/subscription-plans/${id}`);
  return data;
};

export const createAdminSubscriptionPlan = async (
  input: CreateSubscriptionPlanInput
): Promise<AdminSubscriptionPlan> => {
  const { data } = await api.post<AdminSubscriptionPlan>("/api/admin/subscription-plans", input);
  return data;
};

export const updateAdminSubscriptionPlan = async ({
  id,
  input,
}: {
  id: string;
  input: UpdateSubscriptionPlanInput;
}): Promise<AdminSubscriptionPlan> => {
  const { data } = await api.put<AdminSubscriptionPlan>(`/api/admin/subscription-plans/${id}`, input);
  return data;
};

export const deleteAdminSubscriptionPlan = async ({
  id,
  reason,
}: {
  id: string;
  reason: string;
}): Promise<void> => {
  await api.delete(`/api/admin/subscription-plans/${id}`, { data: { reason } });
};

/** Plan Insights for the last 45 days, the same days the AI review covers. */
export const getPlanInsights = async (): Promise<PlanInsights> => {
  const { data } = await api.get<PlanInsights>("/api/admin/subscription-plans/insights");
  return data;
};

export const getPlanAiReview = async (): Promise<PlanAiReviewResponse> => {
  const { data } = await api.get<PlanAiReviewResponse>("/api/admin/subscription-plans/ai-review");
  return data;
};

/** Asks for a new AI review; it takes minutes, so the response only says it has started. */
export const regeneratePlanAiReview = async (): Promise<PlanAiReviewResponse> => {
  const { data } = await api.post<PlanAiReviewResponse>("/api/admin/subscription-plans/ai-review/regenerate");
  return data;
};

// A change to the features on one plan. A limit is set, never removed.
export type PlanFeatureAction =
  | { type: "add"; planId: string; features: { code: string; limitValue?: number | null }[] }
  | { type: "remove"; planId: string; code: string }
  | { type: "limit"; planId: string; code: string; limitValue: number | null };

export const changePlanFeatures = async (action: PlanFeatureAction): Promise<PlanFeatureChanges> => {
  const base = `/api/admin/subscription-plans/${action.planId}/features`;
  const { data } =
    action.type === "add"
      ? await api.post<PlanFeatureChanges>(base, { features: action.features })
      : action.type === "remove"
        ? await api.delete<PlanFeatureChanges>(`${base}/${action.code}`)
        : await api.patch<PlanFeatureChanges>(`${base}/${action.code}`, { limitValue: action.limitValue });
  return data;
};

// Without limitValue: removing an on/off feature. With it: setting a limit (null = no limit).
export const getPlanFeatureImpact = async ({
  planId,
  code,
  limitValue,
}: {
  planId: string;
  code: string;
  limitValue?: number | null;
}): Promise<PlanFeatureImpact> => {
  const { data } = await api.get<PlanFeatureImpact>(`/api/admin/subscription-plans/${planId}/features/${code}/impact`, {
    params: limitValue === undefined ? undefined : { limitValue: limitValue ?? -1 },
  });
  return data;
};

// A copy of a plan under a new name and tier; it is not on sale until the Admin puts it on sale.
export const duplicatePlan = async ({ planId, name, tier }: { planId: string; name: string; tier: string }): Promise<DuplicatedPlan> => {
  const { data } = await api.post<DuplicatedPlan>(`/api/admin/subscription-plans/${planId}/duplicate`, { name, tier });
  return data;
};

// Every plan's id, in the order Sellers and the Admin should see them.
export const reorderPlans = async (planIds: string[]): Promise<void> => {
  await api.put("/api/admin/subscription-plans/order", { planIds });
};

// One page of plan changes, newest first.
export const getPlanHistory = async (
  pageNumber: number,
  pageSize: number,
  action?: PlanHistoryAction
): Promise<PagedResult<PlanHistoryEntry>> => {
  const { data } = await api.get<PagedResult<PlanHistoryEntry>>("/api/admin/subscription-plans/history", {
    params: { pageNumber, pageSize, action },
  });
  return data;
};
