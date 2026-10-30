import type { PlanCustomerFlowDto, RevenueByPlanDto } from "@/types/revenue";

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

/**
 * The line under a plan comparing what its customers who left used with those who stayed; null when
 * no customer left, where there is nothing to compare.
 */
export function usageSignalText(plan: RevenueByPlanDto): { text: string; highlight: boolean } | null {
  const signal = plan.usageSignal;
  // `!signal` also covers an older API build that does not send it.
  if (!signal || signal.left === 0) return null;

  if (signal.hasSignal && signal.featureLabel && signal.stayedRate != null && signal.leftRate != null) {
    return {
      highlight: true,
      text: `${plan.planName} customers who left rarely used ${signal.featureLabel}: ${signal.leftRate}% of the ${signal.left} who left, against ${signal.stayedRate}% of the ${signal.stayed} who stayed. Customers who never find it tend to leave.`,
    };
  }

  const tooFew = signal.left < signal.minimumGroup || signal.stayed < signal.minimumGroup;
  return {
    highlight: false,
    text: tooFew
      ? `Not enough customers to compare usage: ${signal.left} left and ${signal.stayed} stayed, at least ${signal.minimumGroup} of each needed. Pick a longer period.`
      : `The ${signal.left} customers who left used every feature about as much as those who stayed.`,
  };
}

/**
 * How a plan got from its customers at the start to those at the end, as the parts that bridge the
 * two numbers, and a sentence that names every group behind them. Stopping and switching are kept
 * apart so that start − stopped is the "still paying" count retention uses.
 */
export function customerFlowText(
  planName: string,
  flow: PlanCustomerFlowDto
): { parts: { text: string; tone: "lost" | "moved" | "gained" }[]; detail: string } {
  const joined = flow.new + flow.switchedIn;
  const parts = [
    flow.stoppedPaying > 0 && { text: `−${flow.stoppedPaying} stopped`, tone: "lost" as const },
    flow.switchedOut > 0 && { text: `−${flow.switchedOut} switched`, tone: "moved" as const },
    joined > 0 && { text: `+${joined} joined`, tone: "gained" as const },
  ].filter((part) => part !== false);
  return {
    parts,
    detail:
      `Start ${flow.start}: ${flow.stayed} stayed on ${planName}, ${flow.switchedOut} switched to another plan, ` +
      `${flow.stoppedPaying} stopped paying. End ${flow.end} = ${flow.stayed} who stayed + ${flow.new} new + ` +
      `${flow.switchedIn} switched in from another plan.`,
  };
}
