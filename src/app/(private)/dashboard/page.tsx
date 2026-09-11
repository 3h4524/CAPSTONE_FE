"use client";

import { DashboardEmptyState } from "@/components/private/dashboard/dashboard-empty-state";

const DashboardPage = () => {
  return (
    <div className="flex flex-1 flex-col p-6">
      <DashboardEmptyState />
    </div>
  );
};

export default DashboardPage;
