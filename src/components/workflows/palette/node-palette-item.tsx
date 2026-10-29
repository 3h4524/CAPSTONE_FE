"use client";

import type { DragEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORKFLOW_DND_MIME } from "@/constants/workflow";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { useWorkflowCapabilities } from "@/hooks/queries/use-workflow-capabilities";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodePaletteItemProps = {
  definition: WorkflowNodeDefinition;
  disabled: boolean;
  onAdd: (definition: WorkflowNodeDefinition) => void;
};

export const NodePaletteItem = ({ definition, disabled, onAdd }: NodePaletteItemProps) => {
  const Icon = definition.icon;
  const theme = WORKFLOW_CATEGORY_THEME[definition.category];
  const { data: capabilities } = useWorkflowCapabilities();
  const capability = capabilities?.nodes.find(n => n.type === definition.type);

  const startDrag = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(WORKFLOW_DND_MIME, definition.type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Button
      type="button"
      variant="none"
      draggable={!disabled}
      disabled={disabled}
      onDragStart={startDrag}
      onClick={() => onAdd(definition)}
      className={cn(
        "focus-visible:ring-ring/40 h-auto w-full cursor-grab items-start justify-start gap-2.5 rounded-md px-2 py-2 text-left font-normal whitespace-normal transition-colors focus-visible:ring-2 active:cursor-grabbing disabled:cursor-not-allowed",
        theme.item
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", theme.icon)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 font-semibold text-slate-800">{definition.label}</span>
        {capability && !capability.enabled && <Badge variant="outline" className="mt-1 text-[10px]">Not executable yet</Badge>}
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{definition.description}</span>
      </span>
    </Button>
  );
};
