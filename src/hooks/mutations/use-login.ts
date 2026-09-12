"use client";

import { useRouter } from "next/navigation";

import { loginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      showToast("success", `Welcome back, ${result.user.fullName}`);
      router.push(getSafeReturnUrl());
    },
  });
};
