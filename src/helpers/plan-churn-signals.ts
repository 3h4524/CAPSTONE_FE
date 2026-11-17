import { getCurrentLocale, i18n } from "@/i18n/client";
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
  const t = i18n.t.bind(i18n);
  if (signal.left === 0) return t("admin.plans.churnSignals.noneStopped");
  const gaps = featureGaps(signal);
  const widest = gaps[0];
  if (!widest) return null;

  const lead = gaps.every((item) => item.gap > 0)
    ? t("admin.plans.churnSignals.leadEvery")
    : gaps.some((item) => item.gap > 0)
      ? t("admin.plans.churnSignals.leadMost")
      : t("admin.plans.churnSignals.leadAsMuch");
  if (widest.gap <= 0) return lead;
  return `${lead} ${t("admin.plans.churnSignals.biggestGap", { label: widest.label, stayed: widest.stayedRate, left: widest.leftRate })}`;
}

/** The plan's core features in a sentence, e.g. "rendered mockups or design images". */
const coreNames = (signal: PlanChurnSignal, joiner: "or" | "and") => {
  const separator = getCurrentLocale() === "vi" ? (joiner === "or" ? " hoặc " : " và ") : ` ${joiner} `;
  return signal.coreFeatures.map((name) => name.toLowerCase()).join(separator);
};

/** The share of those who left who never used the plan's core features, as a sentence. */
export function coreUseLine(signal: PlanChurnSignal): string | null {
  if (signal.left === 0 || signal.leftWithoutCoreUseRate === null || signal.coreFeatures.length === 0) return null;
  const people = Math.round((signal.leftWithoutCoreUseRate / 100) * signal.left);
  return i18n.t("admin.plans.churnSignals.coreUseLine", {
    rate: signal.leftWithoutCoreUseRate,
    people,
    total: signal.left,
    features: coreNames(signal, "or"),
  });
}

/** What each leave group means, in the words the page shows under its name. */
export function leaveGroupDescription(group: LeaveGroup, signal: PlanChurnSignal): string {
  switch (group.key) {
    case "never_started":
      return signal.coreFeatures.length > 0
        ? i18n.t("admin.plans.churnSignals.neverStartedCore", { features: coreNames(signal, "or") })
        : i18n.t("admin.plans.churnSignals.neverStartedMain");
    case "hit_failures":
      return i18n.t("admin.plans.churnSignals.hitFailures");
    case "hit_limits":
      return i18n.t("admin.plans.churnSignals.hitLimits");
    case "faded":
      return i18n.t("admin.plans.churnSignals.faded");
    case "steady":
      return i18n.t("admin.plans.churnSignals.steady");
  }
}

/** A warning when either group is below the minimum, so the comparison may not hold yet; else null. */
export function smallSampleNote(signal: PlanChurnSignal): string | null {
  if (signal.hasEnoughData || signal.left === 0) return null;
  return i18n.t("admin.plans.churnSignals.smallSample", {
    count: signal.left,
    stayed: signal.stayed,
    minimumGroup: signal.minimumGroup,
  });
}
