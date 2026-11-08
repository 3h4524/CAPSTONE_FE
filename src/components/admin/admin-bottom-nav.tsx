"use client";

import { MobileBottomNav } from "@/components/commons/layout/app-shell/bottom-nav/mobile-bottom-nav";
import { ADMIN_MOBILE_TABS } from "@/constants/navigation";
import { useAdminDashboardMetrics } from "@/hooks/queries/use-admin-dashboard-metrics";
import { useIsPhone } from "@/hooks/use-is-phone";

type AdminBottomNavProps = {
  /** Opens the sidebar, which holds the pages without a tab of their own. */
  onOpenMore: () => void;
};

/** The Admin's tabs on a phone, marking Support while tickets wait for a reply. */
export const AdminBottomNav = ({ onOpenMore }: AdminBottomNavProps) => {
  const isPhone = useIsPhone();
  const { data: metrics } = useAdminDashboardMetrics("year", isPhone);

  return (
    <MobileBottomNav
      tabs={ADMIN_MOBILE_TABS}
      alertHref={metrics?.pendingTickets ? "/admin/support-tickets" : undefined}
      onOpenMore={onOpenMore}
    />
  );
};
