import React from "react";

import { SystemStatisticsDashboard } from "@/components/admin/system-statistics/SystemStatisticsDashboard";

export const metadata = {
  title: "System Statistics | Admin APCS",
  description:
    "System-wide usage, generated assets, batch-job volume, pipeline performance, integration health, and error tracking.",
};

export default function SystemStatisticsPage() {
  return <SystemStatisticsDashboard />;
}
