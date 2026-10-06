"use client";

import { AlertTriangle, CheckCircle2, MousePointerClick } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateWorkflow } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";
import { useReactFlow } from "@xyflow/react";

export const ValidationIssues = () => {
  const { fitView } = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const issues = validateWorkflow(nodes, edges);

  const focusNode = (nodeId: string) => {
    selectNode(nodeId);
    void fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1.1 });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Workflow checks</h2>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          Select a node to configure it.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {issues.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Every step is connected and configured. Run the demo to preview the flow.
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Workflow issues">
              {issues.map((issue) => (
                <li key={issue.id}>
                  {issue.nodeId ? (
                    <Button
                      type="button"
                      variant="none"
                      onClick={() => issue.nodeId && focusNode(issue.nodeId)}
                      className="h-auto w-full items-start justify-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm font-normal whitespace-normal text-amber-900 hover:bg-amber-100"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {issue.message}
                    </Button>
                  ) : (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {issue.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
