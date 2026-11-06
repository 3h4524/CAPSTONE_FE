"use client";

import { renewRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

// Shown inline in the renew modal instead of a floating toast, matching use-upgrade.ts.
export const useRenew = () =>
  useMutation({
    mutationFn: renewRequest,
    suppressErrorToast: true,
  });
