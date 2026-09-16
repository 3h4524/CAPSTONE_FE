"use client";

import { downgradeRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useDowngrade = () =>
  useMutation({
    mutationFn: downgradeRequest,
  });
