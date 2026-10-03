"use client";

import { ApprovalCard } from "@/components/workflows/nodes/approval-card";
import { ImageCard } from "@/components/workflows/nodes/image-card";
import { OutputCard } from "@/components/workflows/nodes/output-card";
import { PromptCard } from "@/components/workflows/nodes/prompt-card";
import { Log } from "@/helpers/log";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const LOG_PREFIX = "node-view";

export const NodeView = (props: NodeProps<WorkflowNode>) => {
  switch (props.data.type) {
    case "product-input":
    case "prompt-synthesis":
    case "generate-listing":
      return <PromptCard {...props} />;
    case "design-image":
    case "apply-mockup":
    case "generate-video":
      return <ImageCard {...props} />;
    case "approval-gate":
      return <ApprovalCard {...props} />;
    case "export-zip":
    case "publish-etsy":
    case "publish-printify":
      return <OutputCard {...props} />;
    default:
      Log.warn({ prefix: LOG_PREFIX, message: "Unhandled workflow node type.", data: props.data.type });
      return <OutputCard {...props} />;
  }
};
