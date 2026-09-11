"use client";

import { useRouter } from "next/navigation";

import type { LoginPayload } from "@/api/auth";
import { loginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { PROFILE_QUERY_KEY } from "@/hooks/queries/use-profile";
import type { LoginResult } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<LoginResult, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      queryClient.removeQueries({ queryKey: PROFILE_QUERY_KEY });
      showToast("success", `Welcome back, ${result.user.fullName}`);
      router.push("/dashboard");
    },
  });
};
