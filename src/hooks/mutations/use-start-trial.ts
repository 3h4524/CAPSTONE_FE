"use client";

import { startTrialRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useStartTrial = () =>
  useMutation({
    mutationFn: startTrialRequest,
  });
