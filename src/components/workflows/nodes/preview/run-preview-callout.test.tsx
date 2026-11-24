import { describe, expect, it } from "vitest";

import { RunPreviewCallout } from "@/components/workflows/nodes/preview/run-preview-callout";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeData } from "@/types/workflow";
import { render, screen } from "@testing-library/react";

describe("RunPreviewCallout", () => {
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
});
