import type { ReactNode } from "react";

import { SignedInRedirect } from "@/components/auth/signed-in-redirect";
import { SiteFooter } from "@/components/commons/layout/site-footer";
import { SiteHeader } from "@/components/commons/layout/site-header";
import { AuthProvider } from "@/providers/global/auth-provider";

const SIGNED_IN_REDIRECT_EXEMPT_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/change-password",
];

type PublicLayoutProps = {
  children: ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <AuthProvider>
      <SiteHeader />
      <SignedInRedirect exemptPaths={SIGNED_IN_REDIRECT_EXEMPT_PATHS} />
      {children}
      <SiteFooter />
    </AuthProvider>
  );
};

export default PublicLayout;
