"use client";

import { useRouter } from "next/navigation";

import type { LoginPayload } from "@/api/auth";
import { loginRequest } from "@/api/auth";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import type { LoginResult } from "@/types/auth";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useAppQueryClient();
  const setAuthUser = useAuthStore((state) => state.setUser);

  return useMutation<LoginResult, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      if (result.requiresTwoFactor) {
        return;
      }

      if (!result.user) {
        return;
      }

      setAuthUser(result.user);
      showToast("success", `Welcome back, ${result.user.fullName}`);
      queryClient.clear();
      router.push(getSafeReturnUrl());
    },
  });
};
