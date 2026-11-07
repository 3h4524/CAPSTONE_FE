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

const SELLER_ROLE = "seller";
const ADMIN_ROLE = "admin";

const normalizeRole = (role: string) => role.trim().toLowerCase();

export const AuthGuard = ({
  children,
  requireSeller = false,
  requireAdmin = false,
}: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const userRoles = user?.roles.map(normalizeRole) ?? [];
  const isSeller = userRoles.includes(SELLER_ROLE);
  const isAdmin = userRoles.includes(ADMIN_ROLE);
  const isAllowed =
    Boolean(user) && (!requireSeller || isSeller) && (!requireAdmin || isAdmin);

  useEffect(() => {
    if (!isHydrated || isAllowed) return;

    if (user) {
      router.replace("/unauthorized");
      return;
    }

    const returnUrl = `${pathname}${window.location.search}`;
    router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }, [isAllowed, isHydrated, pathname, router, user]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Checking sign-in">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isAllowed) return null;

  return <>{children}</>;
};
