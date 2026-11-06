// Free's and the free trial's settings, as the Admin sees and edits them.
export type AllowanceScope = "free" | "trial";

export type AllowanceSetting = {
  scope: AllowanceScope;
  code: string;
  label: string;
  limit: number;
  // The value the backend shipped with, for "Reset to defaults".
  default: number;
};

export type TrialPlanOption = {
  tier: string;
  name: string;
  // Products per run on the plan; -1 means no limit. A trial runs no more than this.
  maxBatchSize: number;
};

export type PlanSettings = {
  // The plan the trial gives; it may not be on sale any more.
  trialPlanTier: string;
  trialPlans: TrialPlanOption[];
  // How long a new trial lasts; trials already running keep their own end.
  trialDays: number;
  allowances: AllowanceSetting[];
  activeTrials: number;
  updatedAt: string | null;
  updatedByName: string | null;
  // The plan Sellers see marked Recommended; null when none is.
  recommendedPlanTier?: string | null;
};

export type UpdatePlanSettingsInput = {
  trialPlanTier: string;
  // 1 to 90 days.
  trialDays: number;
  allowances: { scope: AllowanceScope; code: string; limit: number }[];
};
