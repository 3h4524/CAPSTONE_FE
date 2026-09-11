"use client";

import { useRouter } from "next/navigation";

import { verifyAdminTwoFactorRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useAdminTwoFactor = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: verifyAdminTwoFactorRequest,
    onSuccess: (result) => {
      if (!result.accessToken || !result.user) {
        return;
      }

      tokenStorage.setAccessToken(result.accessToken);
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push("/admin/dashboard");
    },
  });
};
