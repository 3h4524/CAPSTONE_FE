"use client";

import { assistantKeys, deleteAssistantConversations } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { AssistantConversationSummary } from "@/types/assistant";

type DeleteContext = { previous: AssistantConversationSummary[] | undefined };

export const useDeleteAssistantConversations = () => {
  const client = useAppQueryClient();
  return useMutation<void, string | null, DeleteContext>({
    mutationFn: deleteAssistantConversations,
    onMutate: async (exceptConversationId) => {
      await client.cancelQueries({ queryKey: assistantKeys.conversations(), exact: true });
      const previous = client.getQueryData<AssistantConversationSummary[]>(assistantKeys.conversations());
      client.setQueryData<AssistantConversationSummary[]>(
        assistantKeys.conversations(),
        previous?.filter((conversation) => conversation.id === exceptConversationId)
      );
      return { previous };
    },
    onSettled: (_data, error, _exceptConversationId, context) => {
      if (error) client.setQueryData(assistantKeys.conversations(), context?.previous);
    },
  });
};
