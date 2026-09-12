"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useUserStore } from "@/stores/user";
import type { LoginResult } from "@/types/auth";

export const useGoogleLogin = () => {
  const router = useRouter();
  const queryClient = useAppQueryClient();

  return useMutation<LoginResult, string>({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      queryClient.clear();
      showToast("success", `Welcome, ${result.user.fullName}`);
      useUserStore
        .getState()
        .setUser({ email: result.user.email, fullName: result.user.fullName, avatarUrl: null });
      router.push("/dashboard");
    },
  });
};
