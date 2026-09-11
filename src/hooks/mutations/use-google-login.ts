"use client";

import { useRouter } from "next/navigation";

import { googleLoginRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { PROFILE_QUERY_KEY } from "@/hooks/queries/use-profile";
import type { LoginResult } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";

export const useGoogleLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<LoginResult, string>({
    mutationFn: googleLoginRequest,
    onSuccess: (result) => {
      tokenStorage.setAccessToken(result.accessToken);
      queryClient.removeQueries({ queryKey: PROFILE_QUERY_KEY });
      showToast("success", `Welcome, ${result.user.fullName}`);
      router.push("/dashboard");
    },
  });
};
