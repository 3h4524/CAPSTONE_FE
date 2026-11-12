"use client";

import { logoutRequest } from "@/api/auth";
import { getErrorMessage } from "@/helpers/error-message";
import { Log } from "@/helpers/log";
import { forgetActiveThemeUser } from "@/helpers/theme";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";

export const useLogout = () => {
  const queryClient = useAppQueryClient();

  return useMutation<void, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      useAuthStore.getState().clearSession();
      forgetActiveThemeUser();
      queryClient.clear();
      showToast("success", "Signed out");
    },
    onError: (error) => {
      useAuthStore.getState().clearSession();
      forgetActiveThemeUser();
      queryClient.clear();
      Log.error({ prefix: "auth/logout", message: getErrorMessage(error) });
      showToast("warning", "Signed out locally. Please sign in again if the problem persists.");
    },
  });
};
