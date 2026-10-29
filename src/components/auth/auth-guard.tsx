"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth";

type AuthGuardProps = {
  children: React.ReactNode;
  requireSeller?: boolean;
  requireAdmin?: boolean;
};

const SELLER_ROLE = "Seller";
const ADMIN_ROLE = "admin";

export const AuthGuard = ({ children, requireSeller = false, requireAdmin = false }: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const isSeller = Boolean(user?.roles.includes(SELLER_ROLE));
  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === ADMIN_ROLE));
  const isAllowed = Boolean(user) && (!requireSeller || isSeller) && (!requireAdmin || isAdmin);

  useEffect(() => {
    if (!isHydrated || isAllowed) return;

    // A signed-in non-admin has nothing to gain from the login page; send them home instead.
    if (requireAdmin && user) {
      router.replace("/");
      return;
    }

    const returnUrl = `${pathname}${window.location.search}`;
    router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }, [isAllowed, isHydrated, pathname, requireAdmin, router, user]);

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
