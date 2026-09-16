"use client";

import { useRouter } from "next/navigation";

import { verifyAdminTwoFactorRequest } from "@/api/auth";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAuthStore } from "@/stores/auth";

export const useAdminTwoFactor = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: verifyAdminTwoFactorRequest,
    onSuccess: (result) => {
      if (!result.user) {
        return;
      }

      useAuthStore.getState().setUser(result.user);
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push("/admin/dashboard");
    },
  });
};
