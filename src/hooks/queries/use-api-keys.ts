"use client";

import { apiKeyKeys, listApiKeys } from "@/api/api-keys";
import { useQuery } from "@/hooks/queries/use-query";

export const useApiKeys = (userId?: string) =>
  useQuery({
    queryKey: apiKeyKeys.list(userId ?? ""),
    queryFn: () => listApiKeys(),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    suppressErrorToast: true,
  });
