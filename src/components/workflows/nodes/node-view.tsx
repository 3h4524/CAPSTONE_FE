"use client";

import { ApprovalCard } from "@/components/workflows/nodes/approval-card";
import { ExportZipCard } from "@/components/workflows/nodes/export-zip-card";
import { ImageCard } from "@/components/workflows/nodes/image-card";
import { ListingCard } from "@/components/workflows/nodes/listing-card";
import { OutputCard } from "@/components/workflows/nodes/output-card";
import { ProductInputCard } from "@/components/workflows/nodes/product-input-card";
import { PromptCard } from "@/components/workflows/nodes/prompt-card";
import { Log } from "@/helpers/log";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const LOG_PREFIX = "node-view";

export const NodeView = (props: NodeProps<WorkflowNode>) => {
  switch (props.data.type) {
    case "product-input":
      return <ProductInputCard {...props} />;
    case "prompt-synthesis":
      return <PromptCard {...props} />;
    case "generate-listing":
      return <ListingCard {...props} />;
    case "design-image":
    case "apply-mockup":
    case "generate-video":
      return <ImageCard {...props} />;
    case "design-approval":
    case "approval-gate":
    case "review-video":
      return <ApprovalCard {...props} />;
    case "export-zip":
      return <ExportZipCard {...props} />;
    case "publish-etsy":
    case "publish-printify":
    case "publish-social":
      return <OutputCard {...props} />;
    default:
      Log.warn({ prefix: LOG_PREFIX, message: "Unhandled workflow node type.", data: props.data.type });
      return <OutputCard {...props} />;
  }
};
