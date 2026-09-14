"use client";

import { apiKeyKeys, listApiKeys } from "@/api/api-keys";
import { useQuery } from "@tanstack/react-query";

export const useApiKeys = (userId?: string) =>
  useQuery({
    queryKey: apiKeyKeys.list(userId ?? ""),
    queryFn: ({ signal }) => listApiKeys(signal),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
