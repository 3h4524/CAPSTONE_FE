import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AssistantRoot } from "@/components/commons/assistant/assistant-root";
import { UserPreferencesSync } from "@/components/settings/user-preferences-sync";
import { AuthProvider } from "@/providers/global/auth-provider";

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => (
  <AuthProvider>
    <AuthGuard requireAdmin>
      <UserPreferencesSync />
      <AdminShell>{children}</AdminShell>
      <AssistantRoot />
    </AuthGuard>
  </AuthProvider>
);

export default AdminLayout;
