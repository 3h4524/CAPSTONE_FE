"use client";

import { Lock } from "lucide-react";
import type { DragEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WORKFLOW_DND_MIME } from "@/constants/workflow";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { isNodeLocked } from "@/helpers/plan-features";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useWorkflowCapabilities } from "@/hooks/queries/use-workflow-capabilities";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodePaletteItemProps = {
  definition: WorkflowNodeDefinition;
  disabled: boolean;
  onAdd: (definition: WorkflowNodeDefinition) => void;
};

export const NodePaletteItem = ({ definition, disabled: disabledByEditor, onAdd }: NodePaletteItemProps) => {
  const Icon = definition.icon;
  const theme = WORKFLOW_CATEGORY_THEME[definition.category];
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
      className={cn(
        "focus-visible:ring-ring/40 h-auto w-full cursor-grab items-start justify-start gap-2.5 rounded-md px-2 py-2 text-left font-normal whitespace-normal transition-colors focus-visible:ring-2 active:cursor-grabbing disabled:cursor-not-allowed",
        theme.item
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", theme.icon)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-ink-800 block text-[13px] leading-5 font-semibold">{definition.label}</span>
        {capability && !capability.enabled && <Badge variant="outline" className="mt-1 text-[10px]">Not executable yet</Badge>}
        {lockedByPlan && (
          <Badge variant="outline" className="mt-1 gap-1 text-[10px]" title="Not included in your plan">
            <Lock className="size-3" aria-hidden="true" /> Pro
          </Badge>
        )}
        <span className="text-ink-500 mt-0.5 block text-[11px] leading-snug">{definition.description}</span>
      </span>
    </Button>
  );
};
