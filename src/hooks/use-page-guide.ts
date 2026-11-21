"use client";

import { useEffect, useRef } from "react";

import { guideStartStep, needsGuide } from "@/helpers/onboarding-guide";
import { useOnboardingProgress } from "@/hooks/queries/use-onboarding-progress";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useOnboardingGuideStore } from "@/stores/onboarding-guide";
import type { OnboardingGuideKey } from "@/types/onboarding";

/**
 * Opens a page guide by itself the first time a Seller reaches the page, and resumes it where they
 * closed it. Completed or skipped guides stay closed until the guide's version changes.
 */
export const usePageGuide = (guideKey: OnboardingGuideKey, requiresDesktop = false) => {
  const { data, isSuccess } = useOnboardingProgress();
  const isPhone = useIsPhone();
  const isDesktop = useIsDesktop();
  const activeGuide = useOnboardingGuideStore((state) => state.activeGuide);
  const dismissedThisSession = useOnboardingGuideStore((state) => state.dismissedThisSession);
  const start = useOnboardingGuideStore((state) => state.start);
  const autoOpened = useRef(false);

  const canRun = !isPhone && (!requiresDesktop || isDesktop);

  useEffect(() => {
    if (autoOpened.current || !isSuccess || !canRun || activeGuide !== null) return;
    if (dismissedThisSession.includes(guideKey) || !needsGuide(data, guideKey)) return;

    autoOpened.current = true;
    start(guideKey, guideStartStep(data, guideKey));
  }, [activeGuide, canRun, data, dismissedThisSession, guideKey, isSuccess, start]);
};
