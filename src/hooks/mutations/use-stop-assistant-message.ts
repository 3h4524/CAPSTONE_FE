"use client";

import { stopAssistantMessage } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useStopAssistantMessage = () =>
  useMutation({
    mutationFn: stopAssistantMessage,
  });
