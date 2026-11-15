"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { resolveSignedInLanding } from "@/helpers/auth-return-url";
import { useAuthStore } from "@/stores/auth";

type SignedInRedirectProps = {
  exemptPaths?: string[];
};

export const SignedInRedirect = ({ exemptPaths }: SignedInRedirectProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user && !exemptPaths?.includes(pathname)) {
      router.replace(resolveSignedInLanding(user));
    }
  }, [exemptPaths, pathname, router, user]);

  return null;
};
