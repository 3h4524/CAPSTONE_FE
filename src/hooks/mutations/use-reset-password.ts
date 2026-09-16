"use client";

import { useRouter } from "next/navigation";

import { resetPasswordRequest } from "@/api/auth";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: resetPasswordRequest,
    // The invalid/expired-token error is shown inline by the form instead of a toast.
    suppressErrorToast: true,
    onSuccess: () => {
      showToast("success", "Your password has been updated. Sign in with your new password.");
      router.push("/login");
    },
  });
};
