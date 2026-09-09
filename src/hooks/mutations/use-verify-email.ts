"use client";

import { verifyEmailRequest } from "@/api/auth";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: verifyEmailRequest,
    suppressErrorToast: true,
  });
