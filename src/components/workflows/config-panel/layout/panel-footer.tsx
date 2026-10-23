"use client";

import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateWorkflow } from "@/helpers/workflow-graph";
import { issueTextForNode } from "@/helpers/workflow-panel";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";

type PanelFooterProps = {
  node: WorkflowNode;
};

// Says whether the step is ready to run (the same checks as Validate) and offers to delete it.
export const PanelFooter = ({ node }: PanelFooterProps) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const issues = validateWorkflow(nodes, edges).filter((issue) => issue.nodeId === node.id);
  const [firstIssue] = issues;

  return (
    <div className="flex items-center gap-3 border-t px-5 py-3">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-xs" role="status">
        {firstIssue ? (
          <>
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span className="truncate text-amber-800" title={issues.map((issue) => issue.message).join("\n")}>
              {issues.length > 1 ? `${issues.length} issues · ` : ""}
              {issueTextForNode(firstIssue.message, node.data.label)}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="text-muted-foreground">Ready to run</span>
          </>
        )}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 shrink-0 px-2.5 text-xs hover:translate-y-0"
        onClick={() => removeNode(node.id)}
        disabled={isRunning}
      >
        <Trash2 aria-hidden="true" />
        Delete node
      </Button>
    </div>
  );
};
