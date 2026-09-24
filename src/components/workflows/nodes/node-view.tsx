"use client";

import { ApprovalCard } from "@/components/workflows/nodes/approval-card";
import { ImageCard } from "@/components/workflows/nodes/image-card";
import { OutputCard } from "@/components/workflows/nodes/output-card";
import { PromptCard } from "@/components/workflows/nodes/prompt-card";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const NodeView = (props: NodeProps<WorkflowNode>) => {
  switch (props.data.type) {
    case "product-input":
    case "prompt-synthesis":
    case "generate-listing":
      return <PromptCard {...props} />;
    case "design-image":
    case "apply-mockup":
      return <ImageCard {...props} />;
    case "approval-gate":
      return <ApprovalCard {...props} />;
    default:
      return <OutputCard {...props} />;
  }
};
