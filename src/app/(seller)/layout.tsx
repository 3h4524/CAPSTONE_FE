"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/commons/layout/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth";

const SELLER_ROLE = "Seller";

type SellerLayoutProps = {
  children: React.ReactNode;
};

const SellerLayout = ({ children }: SellerLayoutProps) => {
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!isSeller) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default SellerLayout;
