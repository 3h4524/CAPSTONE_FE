import { Suspense } from "react";
import type { Metadata } from "next";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { WorkflowEditorPage } from "@/components/workflows/workflow-editor-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Workflows",
  description: "Design node-based workflows that turn product inputs into finished Etsy assets.",
  pathname: "/workflows",
  robots: { index: false, follow: false },
});

export default function Page() {
  return (
    <Suspense fallback={<PageLoading label="Loading workflows" />}>
      <WorkflowEditorPage />
    </Suspense>
  );
}
