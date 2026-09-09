"use client";

import { resendVerificationEmailRequest } from "@/api/auth";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useResendVerificationEmail = () =>
  useMutation({
    mutationFn: resendVerificationEmailRequest,
    onSuccess: () => {
      showToast("success", "If that address is registered, a new verification email is on its way.");
    },
  });
