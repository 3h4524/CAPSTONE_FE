"use client";

import { logoutRequest } from "@/api/auth";
import { getErrorMessage } from "@/helpers/error-message";
import { Log } from "@/helpers/log";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

export const useLogout = () => {
  const queryClient = useAppQueryClient();

  return useMutation<void, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      useAuthStore.getState().clearSession();
      useUserStore.getState().clearUser();
      queryClient.clear();
      showToast("success", "Signed out");
    },
    onError: (error) => {
      useAuthStore.getState().clearSession();
      useUserStore.getState().clearUser();
      queryClient.clear();
      Log.error({ prefix: "auth/logout", message: getErrorMessage(error) });
      showToast("warning", "Signed out locally. Please sign in again if the problem persists.");
    },
  });
};
