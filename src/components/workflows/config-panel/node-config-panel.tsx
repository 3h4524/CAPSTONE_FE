"use client";

import { NodeConfigForm } from "@/components/workflows/config-panel/node-config-form";
import { ValidationIssues } from "@/components/workflows/config-panel/validation-issues";
import { useWorkflowStore } from "@/stores/workflow";

export const NodeConfigPanel = () => {
  const selectedNode = useWorkflowStore((state) => state.nodes.find((node) => node.id === state.selectedNodeId));

  return selectedNode ? <NodeConfigForm key={selectedNode.id} node={selectedNode} /> : <ValidationIssues />;
};
