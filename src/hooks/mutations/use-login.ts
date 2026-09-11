"use client";

import { useRouter } from "next/navigation";

import type { LoginPayload } from "@/api/auth";
import { loginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useUserStore } from "@/stores/user";
import type { LoginResult } from "@/types/auth";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useAppQueryClient();

  return useMutation<LoginResult, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      queryClient.clear();
      showToast("success", `Welcome back, ${result.user.fullName}`);
      useUserStore
        .getState()
        .setUser({ email: result.user.email, fullName: result.user.fullName, avatarUrl: null });
      router.push("/dashboard");
    },
  });
};
