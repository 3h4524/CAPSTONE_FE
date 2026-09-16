"use client";

import { currentUserRequest } from "@/api/auth";
import { useQuery } from "@/hooks/queries/use-query";

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["auth", "me"],
    queryFn: currentUserRequest,
    retry: false,
    suppressErrorToast: true,
  });
