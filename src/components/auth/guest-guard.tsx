"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Spinner } from "@/components/ui/spinner";
import { resolveSignedInLanding } from "@/helpers/auth-return-url";
import { useAuthStore } from "@/stores/auth";

type GuestGuardProps = {
  children: React.ReactNode;
  returnUrl?: string;
};

export const GuestGuard = ({ children, returnUrl }: GuestGuardProps) => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isHydrated || !user) return;

    router.replace(resolveSignedInLanding(user, returnUrl));
  }, [isHydrated, returnUrl, router, user]);

  if (!isHydrated) {
    return (
      <div
        className="flex min-h-40 items-center justify-center"
        role="status"
        aria-label={t("auth.checkingSignIn")}
      >
        <Spinner className="size-6" />
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
};
