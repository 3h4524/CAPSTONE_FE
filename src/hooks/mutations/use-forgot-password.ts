"use client";

import { forgotPasswordRequest } from "@/api/auth";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useForgotPassword = () =>
  useMutation({
    mutationFn: forgotPasswordRequest,
  });
