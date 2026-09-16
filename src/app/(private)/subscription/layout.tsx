"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { useAuthStore } from "@/stores/auth";

const SELLER_ROLE = "Seller";

type SubscriptionLayoutProps = {
  children: React.ReactNode;
};

const SubscriptionLayout = ({ children }: SubscriptionLayoutProps) => {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const isSeller = Boolean(user?.roles.includes(SELLER_ROLE));

  // The backend's [Authorize(Roles = Seller)] is the real security boundary: a stale or forged
  // client state here only ever produces this redirect or a 401/403 from the API, never data.
  useEffect(() => {
    if (isHydrated && !isSeller) {
      router.replace("/login");
    }
  }, [isHydrated, isSeller, router]);

  if (!isHydrated) {
    return <PageLoading label="Loading subscription" />;
  }

  if (!isSeller) {
    return null;
  }

  return <>{children}</>;
};

export default SubscriptionLayout;
