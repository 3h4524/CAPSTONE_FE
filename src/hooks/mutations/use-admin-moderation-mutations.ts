"use client";

import {
  adminModerationKeys,
  createModerationAllowlist,
  createModerationTerm,
  deleteModerationAllowlist,
  deleteModerationTerm,
  updateModerationAllowlist,
  updateModerationSettings,
  updateModerationTerm,
} from "@/api/admin-moderation";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

// Every write changes what the guardrail decides from now on, so all moderation views are refreshed.
const useRefresh = () => {
  const queryClient = useAppQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminModerationKeys.all });
};

export const useSaveModerationTerm = (onDone?: () => void) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: Parameters<typeof createModerationTerm>[0] }) =>
      id ? updateModerationTerm({ id, input }) : createModerationTerm(input),
    onSuccess: async (_, { id }) => {
      await refresh();
      showToast("success", id ? "Term updated. It applies to the next check." : "Term added. It applies to the next check.");
      onDone?.();
    },
  });
};

export const useToggleModerationTerm = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: updateModerationTerm,
    onSuccess: async (term) => {
      await refresh();
      showToast("success", term.isActive ? `"${term.term}" is active.` : `"${term.term}" is paused.`);
    },
  });
};

export const useDeleteModerationTerm = (onDone?: () => void) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: deleteModerationTerm,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Term deleted.");
      onDone?.();
    },
  });
};

export const useSaveModerationAllowlist = (onDone?: () => void) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: Parameters<typeof createModerationAllowlist>[0] }) =>
      id ? updateModerationAllowlist({ id, input }) : createModerationAllowlist(input),
    onSuccess: async (_, { id }) => {
      await refresh();
      showToast("success", id ? "Allowlist phrase updated." : "Phrase added to the allowlist.");
      onDone?.();
    },
  });
};

export const useDeleteModerationAllowlist = (onDone?: () => void) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: deleteModerationAllowlist,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Phrase removed from the allowlist.");
      onDone?.();
    },
  });
};

export const useUpdateModerationSettings = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: updateModerationSettings,
    onSuccess: async () => {
      await refresh();
      showToast("success", "Settings saved. They apply to the next check.");
    },
  });
};
