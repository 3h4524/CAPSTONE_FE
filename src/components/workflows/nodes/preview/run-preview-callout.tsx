"use client";

import { DesignPreview } from "@/components/workflows/nodes/preview/design-preview";
import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { previewSideOf, type RunPreviewSide } from "@/helpers/workflow-run-view";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";

type RunPreviewCalloutProps = {
  nodeId: string;
  type: WorkflowNodeType;
  status: WorkflowNodeStatus;
};

const SIDE_CLASS_NAMES: Record<RunPreviewSide, string> = {
  right: "top-0 left-full slide-in-from-left-2",
  left: "top-0 right-full slide-in-from-right-2",
  bottom: "top-full left-0 slide-in-from-top-2",
  top: "bottom-full left-0 slide-in-from-bottom-2",
};

const SIDE_MARGINS: Record<RunPreviewSide, "marginLeft" | "marginRight" | "marginTop" | "marginBottom"> = {
  right: "marginLeft",
  left: "marginRight",
  bottom: "marginTop",
  top: "marginBottom",
};

export const RunPreviewCallout = ({ nodeId, type, status }: RunPreviewCalloutProps) => {
  // Beside the node where no other node is: on the right, else on the left, below or above.
  const side = useWorkflowStore((state) => {
    const node = state.nodes.find((candidate) => candidate.id === nodeId);
    return node ? previewSideOf(node, state.nodes) : "right";
  });
  const content =
    type === "design-image" ? (
      <DesignPreview status={status} />
    ) : type === "generate-listing" ? (
      <ListingPreview />
    ) : type === "generate-video" ? (
      <VideoPreview status={status} />
    ) : null;
  if (!content) return null;

  return (
    <aside
      className={cn(
        "bg-wf-surface border-wf-line animate-in fade-in pointer-events-none absolute z-20 rounded-xl border p-2.5 shadow-xl empty:hidden",
        SIDE_CLASS_NAMES[side]
      )}
      style={{ width: RUN_PREVIEW_WIDTH, [SIDE_MARGINS[side]]: RUN_PREVIEW_GAP }}
    >
      {content}
    </aside>
  );
};
