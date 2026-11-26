"use client";

import { type ReactNode, useMemo } from "react";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { DesignPreview } from "@/components/workflows/nodes/preview/design-preview";
import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { MockupPreview } from "@/components/workflows/nodes/preview/mockup-preview";
import { PublishPreview } from "@/components/workflows/nodes/preview/publish-preview";
import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { previewSideOf, type RunPreviewSide } from "@/helpers/workflow-run-view";
import { useVideoGroupTargets } from "@/hooks/queries/use-group-videos";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";

type RunPreviewCalloutProps = {
  nodeId: string;
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

const SIDE_CLASS_NAMES: Record<RunPreviewSide, string> = {
  right: "top-0 left-full slide-in-from-left-2",
  left: "top-0 right-full slide-in-from-right-2",
  bottom: "top-full left-0 slide-in-from-top-2",
  top: "bottom-full left-0 slide-in-from-bottom-2",
};

const SIDE_MARGINS: Record<
  RunPreviewSide,
  "marginLeft" | "marginRight" | "marginTop" | "marginBottom"
> = {
  right: "marginLeft",
  left: "marginRight",
  bottom: "marginTop",
  top: "marginBottom",
};

const previewContent = ({ nodeId, data, status, progress }: RunPreviewCalloutProps): ReactNode => {
  switch (data.type) {
    case "design-image":
      return <DesignPreview status={status} />;
    case "generate-listing":
      return <ListingPreview />;
    case "apply-mockup":
      return <MockupPreview status={status} />;
    case "generate-video":
      return <VideoPreview data={data} status={status} progress={progress} />;
    case "publish-etsy":
    case "publish-printify":
      return <PublishPreview nodeId={nodeId} data={data} status={status} progress={progress} />;
    default:
      return null;
  }
};

export const RunPreviewCallout = (props: RunPreviewCalloutProps) => {
  const side = useWorkflowStore((state) => {
    const node = state.nodes.find((candidate) => candidate.id === props.nodeId);
    return node ? previewSideOf(node, state.nodes) : "right";
  });
  const simulatedMockups = useRunSimulationStore((state) => state.images["apply-mockup"]);
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  const job = useWorkflowRunStore((state) => state.job);
  // A batch video run with several designs lists them beside the video, as Apply mock-up does its designs.
  const { targets: videoTargets } = useVideoGroupTargets();

  const hasMultipleDesigns = useMemo(() => {
    if (props.data.type === "generate-video") return videoTargets.length > 1;
    if (props.data.type !== "apply-mockup") return false;
    if (simulatedMockups && simulatedMockups.length > 0) return true;
    const designImages = job?.products.flatMap((product) => product.images) ?? [];
    if (designImages.length > 1) return true;
    const mockupImages = mockupResult?.images ?? [];
    const uniqueDesigns = new Set(mockupImages.map((m) => m.designImageId).filter(Boolean));
    return uniqueDesigns.size > 1;
  }, [props.data.type, simulatedMockups, job, mockupResult, videoTargets.length]);

  const content = previewContent(props);
  if (!content) return null;

  const width = hasMultipleDesigns ? 420 : RUN_PREVIEW_WIDTH;

  return (
    <aside
      className={cn(
        // A preview with nothing to show yet renders nothing inside its wrapper: no empty frame is drawn then.
        "bg-wf-surface border-wf-line animate-in fade-in absolute z-20 overflow-hidden rounded-xl border p-3 shadow-xl empty:hidden has-[>div:empty]:hidden",
        SIDE_CLASS_NAMES[side]
      )}
      style={{ width, [SIDE_MARGINS[side]]: RUN_PREVIEW_GAP }}
    >
      <NodeControl className="w-full max-w-full min-w-0 overflow-hidden">{content}</NodeControl>
    </aside>
  );
};
