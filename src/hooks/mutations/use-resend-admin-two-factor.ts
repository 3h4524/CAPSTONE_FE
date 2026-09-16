"use client";

import { resendAdminTwoFactorRequest } from "@/api/auth";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useResendAdminTwoFactor = () =>
  useMutation({
    mutationFn: resendAdminTwoFactorRequest,
  });
