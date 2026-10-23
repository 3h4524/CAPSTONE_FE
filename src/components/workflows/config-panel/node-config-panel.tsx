"use client";

import { useState } from "react";
import { Images, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PanelHeader } from "@/components/workflows/config-panel/layout/panel-header";
import { MultiSelectPanel } from "@/components/workflows/config-panel/multi-select-panel";
import { NodeConfigForm } from "@/components/workflows/config-panel/node-config-form";
import { ValidationIssues } from "@/components/workflows/config-panel/validation-issues";
import { RunResultsPanel } from "@/components/workflows/run/run-results-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";

const RESULT_NODE_TYPES: WorkflowNodeType[] = ["design-image", "design-approval", "apply-mockup"];

type PanelView = "results" | "settings";

// With a run open, the nodes that produce images show what they produced next to their settings.
const SelectedNodePanel = ({ node }: { node: WorkflowNode }) => {
  const hasRun = useWorkflowRunStore((state) => state.job !== null);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const [view, setView] = useState<PanelView>("results");

  if (!hasRun || !RESULT_NODE_TYPES.includes(node.data.type)) return <NodeConfigForm node={node} />;

  return (
    <div className="flex h-full flex-col bg-white">
      <PanelHeader node={node} onClose={() => selectNode(null)}>
        <div className="bg-muted/70 grid grid-cols-2 gap-1 rounded-lg p-1" role="group" aria-label="Node panel view">
          {(["results", "settings"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant="none"
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className={cn(
                "h-7 rounded-md px-3 text-xs font-semibold text-slate-600 hover:translate-y-0 hover:text-slate-900",
                view === item && "bg-white text-slate-900 shadow-sm"
              )}
            >
              {item === "results" ? <Images aria-hidden="true" /> : <Settings2 aria-hidden="true" />}
              {item === "results" ? "Results" : "Settings"}
            </Button>
          ))}
        </div>
      </PanelHeader>
      <div className="min-h-0 flex-1">
        {view === "results" ? <RunResultsPanel node={node} /> : <NodeConfigForm node={node} showHeader={false} />}
      </div>
    </div>
  );
};

export const NodeConfigPanel = () => {
  const selectedNodeIds = useWorkflowStore((state) => state.selectedNodeIds);
  const nodes = useWorkflowStore((state) => state.nodes);
  const productId = useWorkflowStore((state) => {
    const input = state.nodes.find((node) => node.data.type === "product-input");
    return typeof input?.data.config.productId === "string" ? input.data.config.productId : "";
  });
  const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));

  if (selectedNodes.length > 1) return <MultiSelectPanel nodes={selectedNodes} />;
  const [activeNode] = selectedNodes;
  return activeNode ? <SelectedNodePanel key={`${activeNode.id}:${productId}`} node={activeNode} /> : <ValidationIssues />;
};
