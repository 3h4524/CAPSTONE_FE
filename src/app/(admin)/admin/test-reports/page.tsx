import type { Metadata } from "next";

import { TestReportsDashboard } from "@/components/admin/test-reports/dashboard";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Test Reports",
  description:
    "Run the end-to-end test suite and read every report it produced, day after day.",
  pathname: "/admin/test-reports",
  robots: { index: false, follow: false },
});

export default function TestReportsPage() {
  return <TestReportsDashboard />;
}
