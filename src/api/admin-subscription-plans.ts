import { api } from "@/api/client";
import type {
  AdminSubscriptionPlan,
  CreateSubscriptionPlanInput,
  UpdateSubscriptionPlanInput,
} from "@/types/admin-subscription-plan";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { PlanInsights } from "@/types/plan-insights";

export const adminSubscriptionPlanKeys = {
  all: ["admin", "subscription-plans"] as const,
  detail: (id: string) => [...adminSubscriptionPlanKeys.all, id] as const,
  insights: () => [...adminSubscriptionPlanKeys.all, "insights"] as const,
  aiReview: () => [...adminSubscriptionPlanKeys.all, "ai-review"] as const,
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
