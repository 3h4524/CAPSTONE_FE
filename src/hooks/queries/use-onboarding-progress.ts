"use client";

import { getOnboardingProgress, onboardingKeys } from "@/api/onboarding";
import { useQuery } from "@/hooks/queries/use-query";

/** The signed-in user's onboarding state: page guide progress and dashboard checklist signals. */
export const useOnboardingProgress = () =>
  useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: () => getOnboardingProgress(),
    staleTime: 60_000,
    suppressErrorToast: true,
  });
