"use client";

import { adminSystemApiKeyKeys, getAdminSystemApiKeys } from "@/api/admin-system-api-keys";
import { useQuery } from "@/hooks/queries/use-query";

// Today's use moves while images are made, so the page follows it every half minute.
export const useAdminSystemApiKeys = () =>
  useQuery({
    queryKey: adminSystemApiKeyKeys.page(),
    queryFn: () => getAdminSystemApiKeys(),
    staleTime: 0,
    refetchInterval: 30_000,
    suppressErrorToast: true,
  });
