import { api } from "@/api/client";
import type {
  AdminSubscriptionPlan,
  CreateSubscriptionPlanInput,
  UpdateSubscriptionPlanInput,
} from "@/types/admin-subscription-plan";

export const adminSubscriptionPlanKeys = {
  all: ["admin", "subscription-plans"] as const,
  detail: (id: string) => [...adminSubscriptionPlanKeys.all, id] as const,
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
