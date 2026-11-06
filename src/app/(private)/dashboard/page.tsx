import type { Metadata } from "next";

import { SellerDashboard } from "@/components/dashboard/seller-dashboard";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Dashboard",
  description: "Overview of your APCS workspace.",
  pathname: "/dashboard",
  robots: { index: false, follow: false },
});

const DashboardPage = () => {
  return <SellerDashboard />;
};

export default DashboardPage;
