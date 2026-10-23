"use client";

import { readString } from "@/helpers/workflow-config";
import { buildNodeOverview, type PanelStat } from "@/helpers/workflow-panel";
import { useBatchJobs } from "@/hooks/queries/use-batch-jobs";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode } from "@/types/workflow";

// The facts shown at the top of a node's panel. Each query runs only for the step that shows it and
// shares its cache with the panels that show the same data (Design image reads the batch Product input lists).
export const useNodeOverview = (node: WorkflowNode): PanelStat[] => {
  const { type, config } = node.data;
  const input = useWorkflowStore((state) => state.nodes.find((item) => item.data.type === "product-input"));
  const mockupNode = useWorkflowStore((state) => state.nodes.find((item) => item.data.type === "apply-mockup"));
  const job = useWorkflowRunStore((state) => state.job);
  const { run } = useWorkflowRuntime();
  const batchId = readString(input?.data.config.batchId);
  const videoProductId = run?.productId ?? readString(input?.data.config.productId);

  const { data: products } = useBatchProducts(type === "product-input" || type === "design-image" ? batchId : "");
  const { data: jobs } = useBatchJobs(type === "product-input" ? batchId : undefined);
  const { data: templates } = useMockupTemplates(undefined, type === "apply-mockup");
  const { data: assets } = useMockupAssets(type === "approval-gate" ? videoProductId : "");

  return buildNodeOverview({
    type,
    config,
    mockupConfig: mockupNode?.data.config,
    products,
    // Drafts never started, so they are not runs (the Previous runs list leaves them out the same way).
    startedRunCount: jobs?.filter((item) => item.status.toLowerCase() !== "draft").length,
    templates,
    assets,
    job,
  });
};
