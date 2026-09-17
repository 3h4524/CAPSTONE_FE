"use client";

import { cancelCheckoutRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useCancelCheckout = () =>
  useMutation({
    mutationFn: cancelCheckoutRequest,
    // Best-effort cleanup call: a failure here isn't the Seller's problem to act on.
    suppressErrorToast: true,
  });
