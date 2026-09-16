"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth";

const ADMIN_ROLE = "Admin";

export const SignedInRedirect = () => {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isHydrated || !user) {
      return;
    }

    const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
    if (returnUrl?.startsWith("/") && !returnUrl.startsWith("//")) {
      router.replace(returnUrl);
      return;
    }

    const isAdmin = user.roles.some((role) => role.toLowerCase() === ADMIN_ROLE.toLowerCase());
    router.replace(isAdmin ? "/admin/dashboard" : "/dashboard");
  }, [isHydrated, user, router]);

  return null;
};
