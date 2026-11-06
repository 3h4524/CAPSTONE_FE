"use client";

import { getEntitlementsRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";

// Under the overview key, so every refresh of the subscription also refreshes what it allows.
export const ENTITLEMENTS_QUERY_KEY = ["subscription-overview", "entitlements"];

// What the Seller's plan allows, so a page can lock what it does not include. The backend
// enforces every rule; this only explains the lock before the Seller hits it.
export const useEntitlements = () =>
  useQuery({
    queryKey: ENTITLEMENTS_QUERY_KEY,
    queryFn: getEntitlementsRequest,
    staleTime: 60_000,
    suppressErrorToast: true,
  });
