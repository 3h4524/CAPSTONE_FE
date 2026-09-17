"use client";

import { listApiKeyProviders } from "@/api/api-keys";
import { useQuery } from "@/hooks/queries/use-query";

export const useApiKeyProviders = (enabled = true) =>
  useQuery({
    queryKey: ["api-key-providers"],
    queryFn: () => listApiKeyProviders(),
    enabled,
    retry: false,
    suppressErrorToast: true,
  });
