import { api } from "@/api/client";
import type { OnboardingProgress, UpdateOnboardingProgressRequest } from "@/types/onboarding";

export const onboardingKeys = {
  all: ["onboarding"] as const,
  progress: () => [...onboardingKeys.all, "progress"] as const,
};

export const getOnboardingProgress = async (signal?: AbortSignal): Promise<OnboardingProgress> =>
  (await api.get<OnboardingProgress>("/api/profile/onboarding", { signal })).data;

export const updateOnboardingProgress = async (
  request: UpdateOnboardingProgressRequest
): Promise<OnboardingProgress> =>
  (await api.put<OnboardingProgress>("/api/profile/onboarding", request)).data;
