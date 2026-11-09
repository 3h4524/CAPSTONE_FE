"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { resolveSignedInLanding } from "@/helpers/auth-return-url";
import { useAuthStore } from "@/stores/auth";

export const SignedInRedirect = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      router.replace(resolveSignedInLanding(user));
    }
  }, [router, user]);

  return null;
};
