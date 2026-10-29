import type { Metadata } from "next";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Dashboard",
  description: "Overview of your APCS workspace.",
  pathname: "/dashboard",
  robots: { index: false, follow: false },
});

const DashboardPage = () => {
  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <DashboardEmptyState />
    </div>
  );
};

export default DashboardPage;
