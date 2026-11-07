"use client";

import { collectMarketQuery } from "@/api/market-insights";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useCollectMarketQuery = () =>
  useMutation({
    mutationFn: ({ query }: { query: string }) => collectMarketQuery(query),
  });
