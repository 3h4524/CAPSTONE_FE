"use client";

import { changePasswordRequest } from "@/api/auth";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useChangePassword = () =>
  useMutation({
    mutationFn: changePasswordRequest,
    // The current-password-incorrect error is shown inline by the form instead of a toast.
    suppressErrorToast: true,
    onSuccess: () => {
      showToast("success", "Your password has been changed.");
    },
  });
