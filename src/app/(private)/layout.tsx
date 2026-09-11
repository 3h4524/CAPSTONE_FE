import type { ReactNode } from "react";

import { AppShell } from "@/components/commons/layout/app-shell/app-shell";

type PrivateLayoutProps = {
  children: ReactNode;
};

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  return <AppShell>{children}</AppShell>;
};

export default PrivateLayout;
