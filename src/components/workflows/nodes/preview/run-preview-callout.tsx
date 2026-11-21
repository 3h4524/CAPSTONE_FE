"use client";

import { DesignPreview } from "@/components/workflows/nodes/preview/design-preview";
import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import type { WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";

type RunPreviewCalloutProps = {
  type: WorkflowNodeType;
  status: WorkflowNodeStatus;
};

export const RunPreviewCallout = ({ type, status }: RunPreviewCalloutProps) => {
  const content =
    type === "design-image" ? <DesignPreview status={status} /> : type === "generate-listing" ? <ListingPreview /> : null;
  if (!content) return null;

  return (
    <aside
      className="bg-wf-surface border-wf-line animate-in fade-in slide-in-from-left-2 pointer-events-none absolute top-0 left-full z-20 rounded-xl border p-2.5 shadow-xl empty:hidden"
      style={{ width: RUN_PREVIEW_WIDTH, marginLeft: RUN_PREVIEW_GAP }}
    >
      {content}
    </aside>
  );
};
