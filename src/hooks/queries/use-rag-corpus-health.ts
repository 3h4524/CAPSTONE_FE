"use client";

import { getRagCorpusHealth, type RagCorpusHealthFilters, ragCorpusHealthKey } from "@/api/rag";
import { useQuery } from "@/hooks/queries/use-query";

export const useRagCorpusHealth = (filters: RagCorpusHealthFilters, enabled: boolean) =>
  useQuery({
    queryKey: ragCorpusHealthKey(filters),
    queryFn: () => getRagCorpusHealth(filters),
    enabled,
    suppressErrorToast: true,
  });
