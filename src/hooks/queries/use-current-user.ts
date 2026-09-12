"use client";

import { getCurrentUserRequest } from "@/api/auth";
import { useQuery } from "@/hooks/queries/use-query";

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUserRequest,
    retry: false,
    suppressErrorToast: true,
  });
