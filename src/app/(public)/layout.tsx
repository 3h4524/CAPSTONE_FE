import type { ReactNode } from "react";

import { SiteFooter } from "@/components/commons/layout/site-footer";
import { SiteHeader } from "@/components/commons/layout/site-header";
import { AuthProvider } from "@/providers/global/auth-provider";

type PublicLayoutProps = {
  children: ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <AuthProvider>
      <SiteHeader />
      {children}
      <SiteFooter />
    </AuthProvider>
  );
};

export default PublicLayout;
