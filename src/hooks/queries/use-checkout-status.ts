"use client";

import { getCheckoutStatusRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";

const POLL_INTERVAL_MS = 3000;

// Pure data hook: polls while "pending", stops once the checkout resolves. Reacting to a
// pending -> paid/failed transition is the caller's job (see checkout-step-payment.tsx) — this
// hook's own onSuccess would only fire once, on the first successful fetch, not on every later
// poll, since the query's lifecycle status stays "success" across refetches.
export const useCheckoutStatus = (invoiceId: string | null) =>
  useQuery({
    queryKey: ["checkout-status", invoiceId],
    queryFn: () => getCheckoutStatusRequest(invoiceId!),
    enabled: invoiceId !== null,
    suppressErrorToast: true,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? POLL_INTERVAL_MS : false),
  });
