"use client";

import { onboardingKeys, updateOnboardingProgress } from "@/api/onboarding";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { OnboardingProgress, UpdateOnboardingProgressRequest } from "@/types/onboarding";

export const useUpdateOnboardingProgress = () => {
  const queryClient = useAppQueryClient();

  return useMutation<OnboardingProgress, UpdateOnboardingProgressRequest>({
    mutationFn: (request) => updateOnboardingProgress(request),
    onSuccess: (progress) => {
      queryClient.setQueryData(onboardingKeys.progress(), progress);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
    suppressErrorToast: true,
  });
};
