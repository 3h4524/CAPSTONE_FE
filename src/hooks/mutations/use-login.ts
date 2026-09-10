"use client";

import { useRouter } from "next/navigation";

import { loginRequest } from "@/api/auth";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAuthStore } from "@/stores/auth";

export const useLogin = () => {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      setUser(result.user);
      showToast("success", `Welcome back, ${result.user.fullName}`);
      router.push("/");
    },
  });
};
