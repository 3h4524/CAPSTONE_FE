"use client";

import { cancelScheduledDowngradeRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useCancelScheduledDowngrade = () =>
  useMutation({
    mutationFn: cancelScheduledDowngradeRequest,
  });
