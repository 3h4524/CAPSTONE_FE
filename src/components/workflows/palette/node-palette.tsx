"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { NodePaletteItem } from "@/components/workflows/palette/node-palette-item";
import { NODE_CARD_WIDTHS, WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { useReactFlow } from "@xyflow/react";

const NODE_DEFINITIONS = Object.values(WORKFLOW_NODE_DEFINITIONS);

type NodePaletteProps = {
  onNodeAdded?: () => void;
};

export const NodePalette = ({ onNodeAdded }: NodePaletteProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkflowStore((state) => state.addNode);
  const nodeCount = useWorkflowStore((state) => state.nodes.length);
  const hasInputNode = useWorkflowStore((state) => state.nodes.some((node) => node.data.type === "product-input"));
  const isLocked = useWorkflowStore((state) => state.isRunning || state.workflowId === null);

  const addAtViewportCenter = (definition: WorkflowNodeDefinition) => {
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const offset = (nodeCount % 5) * 24;
    addNode(createWorkflowNode(definition.type, { x: center.x - NODE_CARD_WIDTHS[definition.type] / 2 + offset, y: center.y - 40 + offset }));
    onNodeAdded?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Nodes</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Drag onto the canvas or click to add.</p>
      </div>
      <ScrollArea className="min-h-0 flex-1 bg-white">
        <div className="px-2 py-2">
          {WORKFLOW_CATEGORIES.map((category, index) => {
            const theme = WORKFLOW_CATEGORY_THEME[category.id];
            const definitions = NODE_DEFINITIONS.filter((definition) => definition.category === category.id);
            return (
              <section
                key={category.id}
                aria-labelledby={`palette-${category.id}`}
                className={cn(index > 0 && "mt-3 border-t border-slate-200/80 pt-3")}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className={cn("size-1.5 rounded-full", theme.dot)} aria-hidden="true" />
                  <h3 id={`palette-${category.id}`} className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                    {category.label}
                  </h3>
                  <span className="ml-auto text-[10px] font-medium text-slate-400 tabular-nums">{definitions.length}</span>
                </div>
                <div className="space-y-0.5">
                  {definitions.map((definition) => (
                    <NodePaletteItem
                      key={definition.type}
                      definition={definition}
                      disabled={isLocked || (definition.type === "product-input" && hasInputNode)}
                      onAdd={addAtViewportCenter}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
