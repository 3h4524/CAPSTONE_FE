"use client";

import { upgradeRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

// Shown inline in the upgrade modal instead of a floating toast, matching use-checkout.ts.
export const useUpgrade = () =>
  useMutation({
    mutationFn: upgradeRequest,
    suppressErrorToast: true,
  });
