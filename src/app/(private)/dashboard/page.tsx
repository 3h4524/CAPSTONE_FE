import type { Metadata } from "next";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your APCS workspace.",
};

const DashboardPage = () => {
  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <DashboardEmptyState />
    </div>
  );
};

export default DashboardPage;
