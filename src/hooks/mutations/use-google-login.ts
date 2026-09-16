"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import type { LoginResult } from "@/types/auth";

type GoogleTwoFactorHandler = (tempToken: string, expiresAtUtc: string) => void;

export const useGoogleLogin = (onTwoFactorRequired?: GoogleTwoFactorHandler) => {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const setAuthUser = useAuthStore((state) => state.setUser);

  return useMutation<LoginResult, string>({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      if (result.requiresTwoFactor && result.tempToken && result.twoFactorExpiresAtUtc) {
        onTwoFactorRequired?.(result.tempToken, result.twoFactorExpiresAtUtc);
        return;
      }

      if (!result.user) {
        return;
      }

      setAuthUser(result.user);
      showToast("success", `Welcome, ${result.user.fullName}`);
      queryClient.clear();
      router.push(getSafeReturnUrl());
    },
  });
};
