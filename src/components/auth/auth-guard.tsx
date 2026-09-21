"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth";

type AuthGuardProps = {
  children: React.ReactNode;
  requireSeller?: boolean;
};

const SELLER_ROLE = "Seller";

export const AuthGuard = ({ children, requireSeller = false }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const isSeller = Boolean(user?.roles.includes(SELLER_ROLE));
  const isAllowed = Boolean(user) && (!requireSeller || isSeller);

  useEffect(() => {
    if (isHydrated && !isAllowed) {
      const returnUrl = `${pathname}${window.location.search}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [isAllowed, isHydrated, pathname, router]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Checking sign-in">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isAllowed) return null;

  return <>{children}</>;
};
