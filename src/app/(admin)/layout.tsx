import type { ReactNode } from "react";

import { AuthProvider } from "@/providers/global/auth-provider";

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => (
  <AuthProvider>{children}</AuthProvider>
);

export default AdminLayout;
