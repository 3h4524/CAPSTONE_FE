"use client";

import { checkoutRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

// Only creates the pending PayOS checkout (QR + amount). The MSG55 success toast and overview
// refresh only fire once payment is actually confirmed — see use-checkout-status.ts.
export const useCheckout = () =>
  useMutation({
    mutationFn: checkoutRequest,
    // Shown inline in the modal (Step 2) instead of a floating toast.
    suppressErrorToast: true,
  });
