"use client";

import { assistantKeys, listAssistantConversations } from "@/api/assistant";
import { useQuery } from "@/hooks/queries/use-query";

export const useAssistantConversations = (enabled: boolean) =>
  useQuery({
    queryKey: assistantKeys.conversations(),
    queryFn: () => listAssistantConversations(),
    enabled,
    staleTime: 30_000,
  });
