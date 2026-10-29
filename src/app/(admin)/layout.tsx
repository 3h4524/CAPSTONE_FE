import type { ReactNode } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthProvider } from "@/providers/global/auth-provider";

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => (
  <AuthProvider>
    <AuthGuard requireAdmin>{children}</AuthGuard>
  </AuthProvider>
);

export default AdminLayout;
