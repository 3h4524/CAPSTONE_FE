"use client";

import { apiKeyKeys, deleteApiKey, saveApiKey } from "@/api/api-keys";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export type SaveApiKeyVariables = {
  connectionId?: string;
  deleting: boolean;
  provider: string;
  name: string;
  environment: string | null;
  apiKey: string | null;
  confirmed: boolean;
};

export const useSaveApiKey = () => {
  const queryClient = useAppQueryClient();

  return useMutation<void, SaveApiKeyVariables>({
    mutationFn: async (variables) => {      if (variables.deleting && variables.connectionId) {
        await deleteApiKey(variables.connectionId);
        return;
      }

      await saveApiKey(variables.connectionId, {
        provider: variables.provider,
        name: variables.name,
        environment: variables.environment,
        apiKey: variables.apiKey,
        confirmed: variables.confirmed,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
    suppressErrorToast: true,
  });
};
