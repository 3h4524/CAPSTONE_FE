import type { Metadata } from "next";

import { BatchJobView } from "@/components/batch-jobs/batch-job-view";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Batch job",
  description: "Configure image generation and follow the progress of a batch job.",
  pathname: "/batches",
  robots: { index: false, follow: false },
});

type BatchJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function BatchJobPage({ params }: BatchJobPageProps) {
  const { jobId } = await params;
  return <BatchJobView batchJobId={jobId} />;
}
