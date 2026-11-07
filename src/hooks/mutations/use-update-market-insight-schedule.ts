"use client";

import { updateMarketInsightSchedule } from "@/api/market-insights";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useUpdateMarketInsightSchedule = () =>
  useMutation({
    mutationFn: updateMarketInsightSchedule,
  });
