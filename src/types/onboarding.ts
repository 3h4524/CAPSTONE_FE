export type OnboardingGuideKey = "api-keys" | "batches" | "mockups" | "workflows";

export type GuideProgressStatus = "active" | "completed" | "skipped";

/** One page guide's state: the version it was run against, how it ended, and the step left off at. */
export type GuideProgress = {
  version: number;
  status: GuideProgressStatus;
  step: number;
};

/** The confirmed first steps, computed by the backend from the tables each step writes to. */
export type OnboardingSignals = {
  apiKeyConnected: boolean;
  batchCreated: boolean;
  mockupTemplateUploaded: boolean;
  workflowRunStarted: boolean;
};

/** GET /api/profile/onboarding */
export type OnboardingProgress = {
  guideProgress: Record<string, GuideProgress>;
  checklistDismissed: boolean;
  signals: OnboardingSignals;
};

/** PUT /api/profile/onboarding */
export type UpdateOnboardingProgressRequest = Omit<OnboardingProgress, "signals">;
