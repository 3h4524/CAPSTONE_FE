import type { Metadata } from "next";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your APCS workspace.",
};

const DashboardPage = () => {
  return (
    <div className="flex flex-1 flex-col p-6">
      <DashboardEmptyState />
    </div>
  );
};

export default DashboardPage;
