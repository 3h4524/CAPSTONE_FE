"use client";

import { adminFeatureKeys, getAdminFeatures } from "@/api/admin-features";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminFeatures = () =>
  useQuery({
    queryKey: adminFeatureKeys.all,
    queryFn: getAdminFeatures,
  });
