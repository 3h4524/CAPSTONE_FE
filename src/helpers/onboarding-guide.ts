import { PAGE_GUIDE_VERSIONS } from "@/constants/onboarding";
import type { OnboardingGuideKey, OnboardingProgress } from "@/types/onboarding";

/** The guide entry that applies to the current code: same version, not completed or skipped. */
export const needsGuide = (
  progress: OnboardingProgress | undefined,
  guideKey: OnboardingGuideKey
): boolean => {
  const entry = progress?.guideProgress[guideKey];
  return (
    !entry ||
    entry.version !== PAGE_GUIDE_VERSIONS[guideKey] ||
    entry.status === "active"
  );
};

/** The step to resume at: the saved one for this version, otherwise the first. */
export const guideStartStep = (
  progress: OnboardingProgress | undefined,
  guideKey: OnboardingGuideKey
): number => {
  const entry = progress?.guideProgress[guideKey];
  return entry?.version === PAGE_GUIDE_VERSIONS[guideKey] ? entry.step : 0;
};
