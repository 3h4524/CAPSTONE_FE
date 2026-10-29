"use client";

import { assistantKeys, deleteAssistantConversation } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { AssistantConversationSummary } from "@/types/assistant";

type DeleteContext = { previous: AssistantConversationSummary[] | undefined };

export const useDeleteAssistantConversation = () => {
  const client = useAppQueryClient();
  return useMutation<void, string, DeleteContext>({
    mutationFn: deleteAssistantConversation,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: assistantKeys.conversations() });
      const previous = client.getQueryData<AssistantConversationSummary[]>(assistantKeys.conversations());
      client.setQueryData<AssistantConversationSummary[]>(
        assistantKeys.conversations(),
        previous?.filter((conversation) => conversation.id !== id)
      );
      return { previous };
    },
    onSettled: (_data, error, _id, context) => {
      if (error) client.setQueryData(assistantKeys.conversations(), context?.previous);
    },
  });
};
