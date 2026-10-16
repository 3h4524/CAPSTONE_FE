import React from "react";

import { RevenueDashboard } from "@/components/admin/revenue/RevenueDashboard";

export const metadata = {
  title: "Revenue Analytics | Admin Dashboard",
  description: "Track your financial performance, MRR growth, and billing history.",
};

export default function RevenuePage() {
  return <RevenueDashboard />;
}
