"use client";

import { Fragment, useState } from "react";
import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { AddStepSheet } from "@/components/workflows/steps/add-step-sheet";
import { WorkflowChecksList, WorkflowChecksSummary } from "@/components/workflows/steps/workflow-checks";
import { WorkflowStepCard } from "@/components/workflows/steps/workflow-step-card";
import { validateWorkflow } from "@/helpers/workflow-graph";
import { orderSteps } from "@/helpers/workflow-steps";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";

// Too much to edit inside a card; everything else opens in place.
const FULL_SCREEN_STEPS: WorkflowNodeType[] = ["generate-video", "review-video", "generate-listing"];

type ListTab = "flow" | "checks";

type WorkflowStepListProps = {
  onShowDiagram: () => void;
};

/**
 * The phone's workflow editor. A run is one straight line of steps, so a list says everything the
 * canvas does in a form a finger can use. It edits the same store, so both show the same workflow.
 */
export const WorkflowStepList = ({ onShowDiagram }: WorkflowStepListProps) => {
  const [tab, setTab] = useState<ListTab>("flow");
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const selectedId = useWorkflowStore((state) => state.selectedNodeIds[0] ?? null);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const hasRun = useWorkflowRunStore((state) => state.job !== null);

  const steps = orderSteps(nodes, edges);
  const issues = validateWorkflow(nodes, edges);
  const opensFullScreen = (node: WorkflowNode) => hasRun || FULL_SCREEN_STEPS.includes(node.data.type);
  const selected = steps.find((node) => node.id === selectedId);

  const fix = (nodeId: string) => {
    setTab("flow");
    selectNode(nodeId);
  };

  return (
    <div className="bg-background absolute inset-0 overflow-y-auto">
      <div className="bg-background/95 sticky top-0 z-10 px-3 py-2 backdrop-blur">
        <div className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1" role="group" aria-label="Workflow view">
          {(["flow", "checks"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                "text-muted-foreground flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold capitalize",
                tab === item && "bg-card text-primary shadow-sm"
              )}
            >
              {item}
              {item === "checks" && issues.length > 0 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-1.5 text-[11px] text-amber-800 dark:text-amber-300 tabular-nums">{issues.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-3 pt-1 pb-6">
        {tab === "checks" ? (
          <WorkflowChecksList issues={issues} onFix={fix} />
        ) : (
          <>
            <WorkflowChecksSummary issues={issues} onFix={fix} onViewAll={() => setTab("checks")} />
            <ol aria-label="Workflow steps">
              {steps.map((node, index) => (
                <Fragment key={node.id}>
                  {index > 0 && <li aria-hidden="true" className="bg-border mx-auto h-4 w-px" />}
                  <li>
                    <WorkflowStepCard
                      node={node}
                      stepNumber={index + 1}
                      issue={issues.find((issue) => issue.nodeId === node.id)}
                      isExpanded={node.id === selectedId}
                      opensFullScreen={opensFullScreen(node)}
                      onToggle={() => selectNode(node.id === selectedId ? null : node.id)}
                    />
                  </li>
                </Fragment>
              ))}
            </ol>
            <AddStepSheet />
            <Button type="button" variant="ghost" className="text-muted-foreground w-full" onClick={onShowDiagram}>
              <GitBranch aria-hidden="true" />
              View diagram
            </Button>
          </>
        )}
      </div>

      <Sheet open={selected !== undefined && opensFullScreen(selected)} onOpenChange={(open) => !open && selectNode(null)}>
        <SheetContent side="bottom" showCloseButton={false} className="h-dvh gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{selected?.data.label ?? "Step"}</SheetTitle>
            <SheetDescription>Settings and results of this step.</SheetDescription>
          </SheetHeader>
          <NodeConfigPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
};
