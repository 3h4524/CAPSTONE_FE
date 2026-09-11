"use client";

import { logoutRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { getErrorMessage } from "@/helpers/error-message";
import { Log } from "@/helpers/log";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useUserStore } from "@/stores/user";
import { useQueryClient } from "@tanstack/react-query";

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<void, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      tokenStorage.clearTokens();
      useUserStore.getState().clearUser();
      queryClient.clear();
      showToast("success", "Signed out");
    },
    onError: (error) => {
      tokenStorage.clearTokens();
      useUserStore.getState().clearUser();
      queryClient.clear();
      Log.error({ prefix: "auth/logout", message: getErrorMessage(error) });
      showToast("warning", "Signed out locally. Please sign in again if the problem persists.");
    },
  });
};
