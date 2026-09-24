"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { NodePaletteItem } from "@/components/workflows/palette/node-palette-item";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeDefinition } from "@/types/workflow";
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
    addNode(createWorkflowNode(definition.type, { x: center.x - 112 + offset, y: center.y - 40 + offset }));
    onNodeAdded?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Nodes</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Drag onto the canvas or click to add.</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          {WORKFLOW_CATEGORIES.map((category) => (
            <section key={category.id} aria-labelledby={`palette-${category.id}`}>
              <h3 id={`palette-${category.id}`} className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {category.label}
              </h3>
              <div className="space-y-2">
                {NODE_DEFINITIONS.filter((definition) => definition.category === category.id).map((definition) => (
                  <NodePaletteItem
                    key={definition.type}
                    definition={definition}
                    accentClassName={category.accentClassName}
                    disabled={isLocked || (definition.type === "product-input" && hasInputNode)}
                    onAdd={addAtViewportCenter}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
