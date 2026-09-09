"use client";

import { registerRequest } from "@/api/auth";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useRegister = () =>
  useMutation({
    mutationFn: registerRequest,
  });
