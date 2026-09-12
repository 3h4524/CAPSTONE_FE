"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useGoogleLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push(getSafeReturnUrl());
    },
  });
};
