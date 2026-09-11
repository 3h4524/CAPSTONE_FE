import type { ReactNode } from "react";

type PrivateLayoutProps = {
  children: ReactNode;
};

const PrivateLayout = ({ children }: PrivateLayoutProps) => {
  return <>{children}</>;
};

export default PrivateLayout;
