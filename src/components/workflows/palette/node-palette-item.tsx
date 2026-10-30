"use client";

import { Lock } from "lucide-react";
import type { DragEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORKFLOW_DND_MIME } from "@/constants/workflow";
import { isNodeLocked } from "@/helpers/plan-features";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useWorkflowCapabilities } from "@/hooks/queries/use-workflow-capabilities";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodePaletteItemProps = {
  definition: WorkflowNodeDefinition;
  iconClassName: string;
  disabled: boolean;
  onAdd: (definition: WorkflowNodeDefinition) => void;
};

export const NodePaletteItem = ({ definition, iconClassName, disabled: disabledByEditor, onAdd }: NodePaletteItemProps) => {
  const Icon = definition.icon;
  const { data: capabilities } = useWorkflowCapabilities();
  const capability = capabilities?.nodes.find(n => n.type === definition.type);
  // A step the Seller's plan does not include cannot be added.
  const { data: entitlements } = useEntitlements();
  const lockedByPlan = isNodeLocked(entitlements, definition.type);
  const disabled = disabledByEditor || lockedByPlan;

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
        {capability && !capability.enabled && <Badge variant="outline">Not executable yet</Badge>}
        {lockedByPlan && (
          <Badge variant="outline" className="gap-1" title="Not included in your plan">
            <Lock className="size-3" aria-hidden="true" /> Pro
          </Badge>
        )}
        <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{definition.description}</span>
      </span>
    </Button>
  );
};
