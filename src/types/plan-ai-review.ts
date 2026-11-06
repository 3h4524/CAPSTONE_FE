import type { MrrBridgeDto } from "@/types/revenue";

/** The AI review of the paid plans (GET /api/admin/subscription-plans/ai-review). */
export interface PlanAiReviewResponse {
  /** False when the backend has no Gemini key, so no review can be written. */
  isConfigured: boolean;
  /** A review is being written now; poll until it is false. */
  isGenerating: boolean;
  /** The newest review that passed the backend's checks; null before the first one. */
  latest: PlanAiReviewSnapshot | null;
  /** Each plan's score and status in the review before `latest`. */
  previousScores: PlanAiScore[];
  nextRefreshAt: string | null;
  /** The newest failed attempt after `latest`. */
  lastFailedAt: string | null;
  /** When an Admin may ask for a new review; null when they may now. */
  regenerateAvailableAt: string | null;
}

export interface PlanAiReviewSnapshot {
  id: string;
  generatedAt: string;
  /** The period the review covers (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  model: string | null;
  /** Display names for the plan and feature keys the review uses. */
  plans: { key: string; name: string; features: { key: string; name: string }[] }[];
  review: PlanAiReview;
  /** MRR over the review's period from the figures the model was given: all plans (planName null), then each plan. */
  mrrBridges: MrrBridgeDto[];
}

export interface PlanAiReview {
  plans: PlanAiAssessment[];
  overall: string;
  overallMetrics: string[];
}

export type PlanAiStatus = "healthy" | "watch" | "at_risk" | "not_enough_data";

export interface PlanAiAssessment {
  /** The plan key. */
  plan: string;
  status: PlanAiStatus;
  score: number | null;
  scoreReason: string;
  scoreMetrics: string[];
  summary: string;
  summaryMetrics: string[];
  outlook: { direction: "improving" | "stable" | "declining"; reason: string; metrics: string[] };
  strengths: PlanAiFinding[];
  risks: PlanAiFinding[];
  featureInsights: PlanAiFeatureInsight[];
  /** Strongest first; the Revenue page shows them next to the plan's churn. */
  churnReasons: PlanAiChurnReason[];
  /** The backend's note when churn was not analysed. */
  churnNote: string | null;
  actions: PlanAiAction[];
}

export interface PlanAiFinding {
  text: string;
  metrics: string[];
}

export type PlanAiFeatureKind = "underused" | "needs_improvement" | "keeps_customers";

export interface PlanAiFeatureInsight {
  /** The feature key. */
  feature: string;
  kinds: PlanAiFeatureKind[];
  text: string;
  suggestion: string;
  metrics: string[];
}

export interface PlanAiChurnReason {
  pattern: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  metrics: string[];
  hypothesis: string | null;
  howToConfirm: string | null;
}

export interface PlanAiAction {
  text: string;
  priority: "high" | "medium" | "low";
  kind: "change" | "experiment" | "investigate";
  metrics: string[];
}

export interface PlanAiScore {
  plan: string;
  status: PlanAiStatus;
  score: number | null;
}
