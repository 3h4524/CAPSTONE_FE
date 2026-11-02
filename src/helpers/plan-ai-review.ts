import type {
  PlanAiAction,
  PlanAiChurnReason,
  PlanAiFeatureKind,
  PlanAiReviewResponse,
  PlanAiReviewSnapshot,
  PlanAiScore,
  PlanAiStatus,
} from "@/types/plan-ai-review";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const STATUS_LABEL: Record<PlanAiStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At risk",
  not_enough_data: "Not enough data",
};

export const OUTLOOK_LABEL = { improving: "Improving", stable: "Stable", declining: "Declining" } as const;

export const FEATURE_KIND_LABEL: Record<PlanAiFeatureKind, string> = {
  needs_improvement: "Needs improvement",
  underused: "Underused",
  keeps_customers: "Keeps customers",
};

export const ACTION_KIND_LABEL: Record<PlanAiAction["kind"], string> = {
  change: "Change",
  experiment: "Experiment",
  investigate: "Investigate",
};

const PRIORITY_ORDER: Record<PlanAiAction["priority"], number> = { high: 0, medium: 1, low: 2 };

/** "1 Aug 2026" from a YYYY-MM-DD date or an ISO timestamp. */
export const formatDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** "1 Aug – 29 Oct 2026", dropping the first year when both ends share it. */
export const formatPeriod = (start: string, end: string) => {
  const from = formatDay(start);
  const to = formatDay(end);
  return start.slice(0, 4) === end.slice(0, 4) ? `${from.slice(0, -5)} – ${to}` : `${from} – ${to}`;
};

/** Actions with the most urgent first; the backend keeps the model's order. */
export const sortActions = (actions: PlanAiAction[]) =>
  [...actions].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

/** The display name of a plan or feature key, falling back to the key itself. */
export const planName = (snapshot: PlanAiReviewSnapshot, key: string) =>
  snapshot.plans.find((plan) => plan.key === key)?.name ?? key;

export const featureName = (snapshot: PlanAiReviewSnapshot, planKey: string, featureKey: string) =>
  snapshot.plans.find((plan) => plan.key === planKey)?.features.find((feature) => feature.key === featureKey)?.name ??
  featureKey;

/**
 * How a plan's score and status changed since the review before, e.g. "Watch → At risk (64 → 49)";
 * null when there is no earlier review of the plan or nothing changed.
 */
export function scoreChange(previous: PlanAiScore[], plan: PlanAiScore): string | null {
  const before = previous.find((item) => item.plan === plan.plan);
  if (!before || (before.status === plan.status && before.score === plan.score)) return null;
  const status = before.status === plan.status ? STATUS_LABEL[plan.status] : `${STATUS_LABEL[before.status]} → ${STATUS_LABEL[plan.status]}`;
  const score = before.score !== null && plan.score !== null && before.score !== plan.score ? ` (${before.score} → ${plan.score})` : "";
  return `${status}${score}`;
}

const CONFIDENCE_ORDER: Record<PlanAiChurnReason["confidence"], number> = { high: 0, medium: 1, low: 2 };

/** Churn reasons with the most certain first, keeping the model's order within a level. */
export const strongestReasons = (reasons: PlanAiChurnReason[] | undefined) =>
  [...(reasons ?? [])].sort((a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence]);

export interface PlanChurnInsight {
  planKey: string;
  planName: string;
  reasons: PlanAiChurnReason[];
  /** Why churn was not analysed, when it was not. */
  note: string | null;
}

export interface ChurnInsights {
  /** The days the review covers, which can differ from the period the Revenue page shows. */
  period: string;
  plans: PlanChurnInsight[];
}

/**
 * Why customers leave, for the Revenue page's MRR movement: the plan with this display name, or
 * every plan when it is null. Null when there is no review or the plan is not in it.
 */
export function churnInsightsFor(response: PlanAiReviewResponse | undefined, planDisplayName: string | null): ChurnInsights | null {
  const snapshot = response?.latest;
  if (!snapshot) return null;

  const plans = snapshot.review.plans
    .map((assessment) => ({
      planKey: assessment.plan,
      planName: planName(snapshot, assessment.plan),
      reasons: strongestReasons(assessment.churnReasons),
      note: assessment.churnNote ?? null,
    }))
    .filter((plan) => planDisplayName === null || plan.planName === planDisplayName)
    .filter((plan) => plan.reasons.length > 0 || plan.note !== null);

  return plans.length === 0 ? null : { period: formatPeriod(snapshot.periodStart, snapshot.periodEnd), plans };
}

/** Why the Regenerate button is off, or null when an Admin may press it now. */
export function regenerateBlocker(response: PlanAiReviewResponse, now: Date): string | null {
  if (!response.isConfigured) return "No Gemini key is set on the server.";
  if (response.isGenerating) return "A review is being written.";
  if (response.regenerateAvailableAt && new Date(response.regenerateAvailableAt) > now)
    return `Available again on ${formatDay(response.regenerateAvailableAt)} at ${response.regenerateAvailableAt.slice(11, 16)} UTC.`;
  return null;
}
