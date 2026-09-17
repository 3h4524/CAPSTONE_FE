import type { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
};

const AdminLayout = ({ children }: AdminLayoutProps) => <>{children}</>;

export default AdminLayout;
