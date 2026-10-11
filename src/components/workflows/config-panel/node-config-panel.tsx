"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { NodeConfigForm } from "@/components/workflows/config-panel/node-config-form";
import { ValidationIssues } from "@/components/workflows/config-panel/validation-issues";
import { RunResultsPanel } from "@/components/workflows/run/run-results-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";

const RESULT_NODE_TYPES: WorkflowNodeType[] = ["design-image", "design-approval", "apply-mockup"];

type PanelView = "results" | "settings";

// With a run open, the nodes that produce images show what they produced next to their settings.
const SelectedNodePanel = ({ node }: { node: WorkflowNode }) => {
  const hasRun = useWorkflowRunStore((state) => state.job !== null);
  const [view, setView] = useState<PanelView>("results");

  if (!hasRun || !RESULT_NODE_TYPES.includes(node.data.type)) return <NodeConfigForm node={node} />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-4 py-2" role="group" aria-label="Node panel view">
        {(["results", "settings"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={view === item ? "secondary" : "ghost"}
            aria-pressed={view === item}
            onClick={() => setView(item)}
          >
            {item === "results" ? "Results" : "Settings"}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {view === "results" ? <RunResultsPanel node={node} /> : <NodeConfigForm node={node} />}
      </div>
    </div>
  );
};

export const NodeConfigPanel = () => {
  const selectedNode = useWorkflowStore((state) => state.nodes.find((node) => node.id === state.selectedNodeId));

  return selectedNode ? <SelectedNodePanel key={selectedNode.id} node={selectedNode} /> : <ValidationIssues />;
};
