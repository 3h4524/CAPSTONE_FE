"use client";

import { adminPlanSettingsKeys, getPlanSettings } from "@/api/admin-plan-settings";
import { useQuery } from "@/hooks/queries/use-query";

export const usePlanSettings = () =>
  useQuery({
    queryKey: adminPlanSettingsKeys.all,
    queryFn: getPlanSettings,
  });
