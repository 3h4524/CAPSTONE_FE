import { Suspense } from "react";
import type { Metadata } from "next";

import { BatchWorkspace } from "@/components/batches/batch-workspace";
import { PageLoading } from "@/components/commons/layout/page-loading";

export const metadata: Metadata = {
  title: "Batches",
  description: "Manage product batches and their queues.",
};

// The workspace reads ?batch and ?status from the URL, which needs a Suspense boundary.
const BatchesPage = () => (
  <Suspense fallback={<PageLoading label="Loading batches" />}>
    <BatchWorkspace />
  </Suspense>
);

export default BatchesPage;
