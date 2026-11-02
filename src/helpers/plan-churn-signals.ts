import type { FeatureChurnSignal, LeaveGroup, PlanChurnSignal } from "@/types/plan-insights";

export interface FeatureGap {
  metric: string;
  label: string;
  stayedRate: number;
  leftRate: number;
  stayedUsers: number;
  leftUsers: number;
  /** Percentage points those who stayed used it more than those who left; negative when less. */
  gap: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Every feature the plan includes that both groups can be compared on, the widest gap first. */
export function featureGaps(signal: PlanChurnSignal): FeatureGap[] {
  return signal.features
    .filter(
      (feature): feature is FeatureChurnSignal & { stayedRate: number; leftRate: number } =>
        feature.includedInPlan && feature.stayedRate !== null && feature.leftRate !== null
    )
    .map((feature) => ({
      metric: feature.metric,
      label: feature.label,
      stayedRate: feature.stayedRate,
      leftRate: feature.leftRate,
      stayedUsers: feature.stayedUsers ?? 0,
      leftUsers: feature.leftUsers ?? 0,
      gap: round1(feature.stayedRate - feature.leftRate),
    }))
    .sort((a, b) => b.gap - a.gap);
}

/** One sentence an Admin can read before the bars; null when there is nothing to compare. */
export function churnHeadline(signal: PlanChurnSignal): string | null {
  if (signal.left === 0) return "No customers stopped paying in this period.";
  const gaps = featureGaps(signal);
  const widest = gaps[0];
  if (!widest) return null;

  const lead = gaps.every((item) => item.gap > 0)
    ? "Customers who left used every feature less than those who stayed."
    : gaps.some((item) => item.gap > 0)
      ? "Customers who left used most features less than those who stayed."
      : "Customers who left used the features as much as those who stayed.";
  if (widest.gap <= 0) return lead;
  return `${lead} The biggest gap is ${widest.label}: ${widest.stayedRate}% of those who stayed used it, against ${widest.leftRate}% of those who left.`;
}

/** The plan's core features in a sentence, e.g. "rendered mockups or design images". */
const coreNames = (signal: PlanChurnSignal, joiner: "or" | "and") =>
  signal.coreFeatures.map((name) => name.toLowerCase()).join(` ${joiner} `);

/** The share of those who left who never used the plan's core features, as a sentence. */
export function coreUseLine(signal: PlanChurnSignal): string | null {
  if (signal.left === 0 || signal.leftWithoutCoreUseRate === null || signal.coreFeatures.length === 0) return null;
  const people = Math.round((signal.leftWithoutCoreUseRate / 100) * signal.left);
  return `${signal.leftWithoutCoreUseRate}% of those who left (${people} of ${signal.left}) never used ${coreNames(signal, "or")}.`;
}

/** What each leave group means, in the words the page shows under its name. */
export function leaveGroupDescription(group: LeaveGroup, signal: PlanChurnSignal): string {
  switch (group.key) {
    case "never_started":
      return signal.coreFeatures.length > 0
        ? `Never used ${coreNames(signal, "or")}, the plan's most used features.`
        : "Never used the plan's main features.";
    case "hit_failures":
      return "At least 20% of their attempts failed in their last 30 days.";
    case "hit_limits":
      return "Reached a daily cap on 3 or more of their last 30 days.";
    case "faded":
      return "Used the plan at least 50% less than in the month before.";
    case "steady":
      return "None of these: the data does not show why they left.";
  }
}

/** A warning when either group is below the minimum, so the comparison may not hold yet; else null. */
export function smallSampleNote(signal: PlanChurnSignal): string | null {
  if (signal.hasEnoughData || signal.left === 0) return null;
  return `Small sample: only ${signal.left} ${signal.left === 1 ? "customer" : "customers"} left and ${signal.stayed} stayed, so these comparisons may not be accurate yet. They become reliable from ${signal.minimumGroup} in each group.`;
}
