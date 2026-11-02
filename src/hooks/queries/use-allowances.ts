"use client";

import { getAllowancesRequest } from "@/api/allowances";
import { useQuery } from "@/hooks/queries/use-query";

// Under the overview key, so every refresh of the subscription also refreshes what is left.
export const ALLOWANCES_QUERY_KEY = ["subscription-overview", "allowances"];

// What a Seller on Free or the Pro trial has used and may still use. The backend enforces every
// allowance; this only shows what is left before the Seller runs out.
export const useAllowances = () =>
  useQuery({
    queryKey: ALLOWANCES_QUERY_KEY,
    queryFn: getAllowancesRequest,
    staleTime: 30_000,
    suppressErrorToast: true,
  });
