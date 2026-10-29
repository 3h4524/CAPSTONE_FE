import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/commons/layout/app-shell/app-shell";
import { AuthProvider } from "@/providers/global/auth-provider";

type PrivateLayoutProps = {
  children: ReactNode;
};

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AuthProvider>
  );
};

export default PrivateLayout;
