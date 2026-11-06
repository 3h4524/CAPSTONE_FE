import { api } from "@/api/client";
import type { PlanSettings, UpdatePlanSettingsInput } from "@/types/plan-settings";

export const adminPlanSettingsKeys = {
  all: ["admin", "plan-settings"] as const,
};

export const getPlanSettings = async (): Promise<PlanSettings> => {
  const { data } = await api.get<PlanSettings>("/api/admin/plan-settings");
  return data;
};

// A plan on sale to mark Recommended for Sellers, or null for none.
export const setRecommendedPlan = async (tier: string | null): Promise<PlanSettings> => {
  const { data } = await api.put<PlanSettings>("/api/admin/plan-settings/recommended-plan", { tier });
  return data;
};

export const updatePlanSettings = async (input: UpdatePlanSettingsInput): Promise<PlanSettings> => {
  const { data } = await api.put<PlanSettings>("/api/admin/plan-settings", input);
  return data;
};
