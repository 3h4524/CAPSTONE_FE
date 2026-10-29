"use client";

import { assistantKeys, streamAssistantChat } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";
import type { SendAssistantMessageInput } from "@/types/assistant";

export const useSendAssistantMessage = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: { input: SendAssistantMessageInput; signal: AbortSignal }) =>
      streamAssistantChat(input, (event) => useAssistantStore.getState().applyStreamEvent(event), signal),
    suppressErrorToast: true,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
};
