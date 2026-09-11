import type { ReactNode } from "react";

import { AppShell } from "@/components/private/app-shell/app-shell";

type PrivateLayoutProps = {
  children: ReactNode;
};

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  return <AppShell>{children}</AppShell>;
};

export default PrivateLayout;
