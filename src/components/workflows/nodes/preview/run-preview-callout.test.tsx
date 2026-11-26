import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunPreviewCallout } from "@/components/workflows/nodes/preview/run-preview-callout";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeData } from "@/types/workflow";
import { render, screen } from "@testing-library/react";

// The designs of a batch video run: more than one widens Generate Video's preview to list them.
const videoTargets = vi.hoisted(() => ({ current: [] as { runId: string }[] }));
vi.mock("@/hooks/queries/use-group-videos", () => ({
  useVideoGroupTargets: () => ({ group: null, targets: videoTargets.current }),
}));
vi.mock("@/components/workflows/nodes/preview/video-preview", () => ({
  VideoPreview: () => <div>video</div>,
}));

describe("RunPreviewCallout", () => {
  beforeEach(() => {
    videoTargets.current = [];
  });

  it("renders interactive preview callout for design-image", () => {
    useWorkflowStore.setState({
      nodes: [
        {
          id: "node-1",
          position: { x: 0, y: 0 },
          data: { type: "design-image", label: "Design image", config: {} },
        } as WorkflowNode,
      ],
    });
    useWorkflowRunStore.setState({
      job: {
        products: [
          {
            id: "p1",
            productName: "T-Shirt",
            images: [{ id: "d1", imageUrl: "https://img/d1.png", variationIndex: 0 }],
          },
        ],
      } as never,
    });

    const { container } = render(
      <RunPreviewCallout
        nodeId="node-1"
        data={{ type: "design-image", label: "Design image", config: {} } as WorkflowNodeData}
        status="success"
        progress={100}
      />
    );

    const aside = container.querySelector("aside");
    expect(aside).toBeInTheDocument();
    expect(aside).not.toHaveClass("pointer-events-none");
    expect(screen.getByText("Designs")).toBeInTheDocument();
  });

  it("renders widened callout for apply-mockup when multiple designs exist", () => {
    useWorkflowStore.setState({
      nodes: [
        {
          id: "node-2",
          position: { x: 0, y: 0 },
          data: { type: "apply-mockup", label: "Apply mockup", config: {} },
        } as WorkflowNode,
      ],
    });
    useWorkflowRunStore.setState({
      job: {
        products: [
          {
            id: "p1",
            productName: "T-Shirt",
            images: [
              { id: "d1", imageUrl: "https://img/d1.png", variationIndex: 0 },
              { id: "d2", imageUrl: "https://img/d2.png", variationIndex: 1 },
            ],
          },
        ],
      } as never,
    });

    const { container } = render(
      <RunPreviewCallout
        nodeId="node-2"
        data={{ type: "apply-mockup", label: "Apply mockup", config: {} } as WorkflowNodeData}
        status="success"
        progress={100}
      />
    );

    const aside = container.querySelector("aside");
    expect(aside).toHaveStyle({ width: "420px" });
  });

  it.each([
    [2, "420px"],
    [1, undefined],
  ])("widens Generate Video's callout when the batch video run has %i designs", (count, width) => {
    videoTargets.current = Array.from({ length: count }, (_, index) => ({ runId: `run-${index}` }));
    useWorkflowStore.setState({
      nodes: [
        {
          id: "node-3",
          position: { x: 0, y: 0 },
          data: { type: "generate-video", label: "Generate video", config: {} },
        } as WorkflowNode,
      ],
    });

    const { container } = render(
      <RunPreviewCallout
        nodeId="node-3"
        data={{ type: "generate-video", label: "Generate video", config: {} } as WorkflowNodeData}
        status="success"
        progress={100}
      />
    );

    const aside = container.querySelector("aside");
    if (width) expect(aside).toHaveStyle({ width });
    else expect(aside).not.toHaveStyle({ width: "420px" });
  });
});
