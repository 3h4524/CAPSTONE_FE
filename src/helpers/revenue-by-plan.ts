import type { RevenueByPlanDto } from "@/types/revenue";

// Creator: Dark Navy | Studio: Vivid Orange | Starter: Slate Gray
const PLAN_COLORS: Record<string, string> = {
  Creator: "#1e3a5f",
  Studio: "#ea580c",
  Starter: "#64748b",
  Pro: "#6366f1",
  Enterprise: "#10b981",
};

const DEFAULT_COLORS = ["#1e3a5f", "#ea580c", "#64748b", "#6366f1", "#10b981", "#0ea5e9"];

/** One color per plan, shared by the donut, the plan table and the transaction list. */
export const getPlanColor = (planName: string, index = 0) =>
  PLAN_COLORS[planName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

/** Below this retention the value is highlighted as a warning. */
export const LOW_RETENTION_PERCENT = 60;

export interface PlanLeaders {
  mostPurchased: string | null;
  topArpu: string | null;
  topRetention: string | null;
}

/**
 * Picks the plan that leads each column. Plans without a valid value (null ARPU or retention, zero
 * purchases) are never picked, and nothing is picked when no plan qualifies.
 */
export function pickPlanLeaders(plans: RevenueByPlanDto[]): PlanLeaders {
  const leader = (value: (p: RevenueByPlanDto) => number | null | undefined): string | null => {
    let best: { name: string; value: number } | null = null;
    for (const plan of plans) {
      const v = value(plan);
      // `== null` also catches a field an older API build does not send at all.
      if (v == null || v <= 0) continue;
      if (best === null || v > best.value) best = { name: plan.planName, value: v };
    }
    return best?.name ?? null;
  };

  return {
    mostPurchased: leader((p) => p.purchaseCount),
    topArpu: leader((p) => p.arpu),
    topRetention: leader((p) => p.retentionRate),
  };
}
