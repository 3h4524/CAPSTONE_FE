"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

type GoogleTwoFactorHandler = (tempToken: string, expiresAtUtc: string) => void;

export const useGoogleLogin = (onTwoFactorRequired?: GoogleTwoFactorHandler) => {
  const router = useRouter();

  return useMutation({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      if (result.requiresTwoFactor && result.tempToken && result.twoFactorExpiresAtUtc) {
        onTwoFactorRequired?.(result.tempToken, result.twoFactorExpiresAtUtc);
        return;
      }

      if (!result.accessToken || !result.user) {
        return;
      }

      tokenStorage.setAccessToken(result.accessToken);
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push("/");
    },
  });
};
