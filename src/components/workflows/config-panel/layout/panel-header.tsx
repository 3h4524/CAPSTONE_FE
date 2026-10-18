import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { findPipelinePosition } from "@/helpers/workflow-panel";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";

type PanelHeaderProps = {
  node: WorkflowNode;
  onClose: () => void;
  /** Shown under the description, such as a switch between the node's views. */
  children?: ReactNode;
};

// The selected node's name, kind, place in the run and run status, with what the step does underneath.
export const PanelHeader = ({ node, onClose, children }: PanelHeaderProps) => {
  const nodes = useWorkflowStore((state) => state.nodes);
  const definition = WORKFLOW_NODE_DEFINITIONS[node.data.type];
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const pill = node.data.status === "idle" ? null : NODE_STATUS_PILLS[node.data.status];
  const position = findPipelinePosition(node.data.type, nodes);
  const Icon = definition.icon;

  return (
    <div className="border-b px-5 pt-4 pb-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white">
          <Icon className={cn("size-4.5", category?.iconClassName)} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base leading-snug font-semibold text-slate-900">{node.data.label}</h2>
          <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
            <span className="truncate">
              {category?.label}
              {position && ` · Step ${position.index + 1} of ${position.steps.length}`}
            </span>
            {pill && <span className={cn("shrink-0 rounded px-1.5 py-px text-[11px] font-medium", pill.className)}>{pill.label}</span>}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-mt-1 -mr-2 shrink-0 text-slate-500 hover:translate-y-0"
          aria-label="Close node settings"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{definition.description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
