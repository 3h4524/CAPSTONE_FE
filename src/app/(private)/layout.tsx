import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AssistantRoot } from "@/components/commons/assistant/assistant-root";
import { AppShell } from "@/components/commons/layout/app-shell/app-shell";
import { UserPreferencesSync } from "@/components/settings/user-preferences-sync";
import { AuthProvider } from "@/providers/global/auth-provider";

type PrivateLayoutProps = {
  children: ReactNode;
};

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  return (
    <AuthProvider>
      <AuthGuard requireSeller>
        <UserPreferencesSync />
        <AppShell>{children}</AppShell>
        <AssistantRoot />
      </AuthGuard>
    </AuthProvider>
  );
};

export default PrivateLayout;
