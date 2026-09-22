"use client";

import { AuthGuard } from "@/components/auth/auth-guard";

type SubscriptionLayoutProps = {
  children: React.ReactNode;
};

const SubscriptionLayout = ({ children }: SubscriptionLayoutProps) => (
  <AuthGuard requireSeller>{children}</AuthGuard>
);

export default SubscriptionLayout;
