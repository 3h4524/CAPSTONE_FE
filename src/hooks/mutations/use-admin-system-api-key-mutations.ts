"use client";

import {
  addSystemApiKey,
  adminSystemApiKeyKeys,
  checkSystemApiKey,
  clearSystemApiKeyRefusal,
  deleteSystemApiKey,
  reorderSystemApiKeys,
  updateSystemApiKey,
  updateSystemApiKeyProvider,
} from "@/api/admin-system-api-keys";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { AdminSystemApiKeys } from "@/types/admin-system-api-keys";

const isConflict = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { response?: { status?: number } }).response?.status === 409;

// Every change answers with the whole page; another Admin's change in between (409) reloads it so the next try starts
// from what is there now.
const usePageMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<AdminSystemApiKeys>,
  success: (page: AdminSystemApiKeys, variables: TVariables) => string | null,
  onDone?: () => void
) => {
  const queryClient = useAppQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (page, variables) => {
      queryClient.setQueryData(adminSystemApiKeyKeys.page(), page);
      const message = success(page, variables);
      if (message) showToast("success", message);
      onDone?.();
    },
    onError: (error) => {
      showToast("error", getErrorMessage(error));
      if (isConflict(error)) void queryClient.invalidateQueries({ queryKey: adminSystemApiKeyKeys.all });
    },
  });
};

export const useAddSystemApiKey = (onDone?: () => void) =>
  usePageMutation(addSystemApiKey, (_, input) => `${input.label.trim()} was checked and added.`, onDone);

export const useUpdateSystemApiKey = () =>
  usePageMutation(updateSystemApiKey, (_, { input }) =>
    input.isActive ? `${input.label} is in use.` : `${input.label} is switched off. New requests skip it.`
  );

export const useDeleteSystemApiKey = (onDone?: () => void) => usePageMutation(deleteSystemApiKey, () => "Key deleted.", onDone);

export const useCheckSystemApiKey = () =>
  usePageMutation(checkSystemApiKey, (page, id) => {
    const key = page.providers.flatMap((provider) => provider.keys).find((candidate) => candidate.id === id);
    if (!key) return null;
    if (key.lastCheckSucceeded) return `${key.label} works.`;
    showToast("error", `The provider refused ${key.label}. Switch it off or replace it.`);
    return null;
  });

export const useClearSystemApiKeyRefusal = () =>
  usePageMutation(clearSystemApiKeyRefusal, () => "The key is back in use for today.");

export const useUpdateSystemApiKeyProvider = () =>
  usePageMutation(updateSystemApiKeyProvider, (page, { provider }) => {
    const name = page.providers.find((candidate) => candidate.provider === provider)?.name ?? provider;
    return `${name} limits saved. Every server uses them within a minute.`;
  });

export const useReorderSystemApiKeys = () => usePageMutation(reorderSystemApiKeys, () => null);
