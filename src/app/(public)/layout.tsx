import type { ReactNode } from "react";

import { SiteFooter } from "@/components/commons/layout/site-footer";
import { SiteHeader } from "@/components/commons/layout/site-header";

type PublicLayoutProps = {
  children: ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
};

export default PublicLayout;
