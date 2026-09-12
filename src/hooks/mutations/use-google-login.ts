"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { getSafeReturnUrl } from "@/helpers/auth-return-url";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAuthStore } from "@/stores/auth";

export const useGoogleLogin = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      setUser(result.user);
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push(getSafeReturnUrl());
    },
  });
};
