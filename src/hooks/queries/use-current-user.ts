"use client";

import { meRequest } from "@/api/auth";
import { useQuery } from "@/hooks/queries/use-query";

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["auth", "me"],
    queryFn: meRequest,
    retry: false,
    suppressErrorToast: true,
  });
