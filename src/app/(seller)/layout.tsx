"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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

  // No sidebar here — feat/private-app-shell owns the real app shell and isn't merged into
  // this branch yet (it still predates the cookie-auth migration, which would reopen the same
  // tokenStorage-vs-cookie conflict just resolved). This layout only keeps the Seller-role gate
  // until the subscription page moves under that shell.
  return <>{children}</>;
};

export default SellerLayout;
