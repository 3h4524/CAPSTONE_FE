import type { Metadata } from "next";

import { TestReportDetail } from "@/components/admin/test-reports/test-report-detail";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Test Report",
  description: "Every test of one run, with what went wrong when a test did not pass.",
  pathname: "/admin/test-reports",
  robots: { index: false, follow: false },
});

export default async function TestReportDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  return <TestReportDetail runId={runId} />;
}
