"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import type { LoginResult } from "@/types/auth";

export const useGoogleLogin = () => {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const setAuthUser = useAuthStore((state) => state.setUser);

  return useMutation<LoginResult, string>({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      queryClient.clear();
      setAuthUser(result.user);
      showToast("success", `Welcome, ${result.user.fullName}`);
      useUserStore
        .getState()
        .setUser({ email: result.user.email, fullName: result.user.fullName, avatarUrl: null });
      router.push(getSafeReturnUrl());
    },
  });
};
