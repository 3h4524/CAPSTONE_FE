"use client";

import type { DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { WORKFLOW_DND_MIME } from "@/constants/workflow";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodePaletteItemProps = {
  definition: WorkflowNodeDefinition;
  iconClassName: string;
  disabled: boolean;
  onAdd: (definition: WorkflowNodeDefinition) => void;
};

export const NodePaletteItem = ({ definition, iconClassName, disabled, onAdd }: NodePaletteItemProps) => {
  const Icon = definition.icon;

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
      className="h-auto w-full cursor-grab items-start justify-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left font-normal whitespace-normal hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClassName)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{definition.label}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{definition.description}</span>
      </span>
    </Button>
  );
};
