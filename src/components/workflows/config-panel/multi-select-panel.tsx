"use client";

import { Copy, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";

type MultiSelectPanelProps = {
  nodes: WorkflowNode[];
};

export const MultiSelectPanel = ({ nodes }: MultiSelectPanelProps) => {
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const duplicateSelectedNodes = useWorkflowStore((state) => state.duplicateSelectedNodes);
  const removeSelectedNodes = useWorkflowStore((state) => state.removeSelectedNodes);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{nodes.length} nodes selected</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Configure nodes one at a time, or apply a bulk action.</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {nodes.map((node) => (
          <li key={node.id} className="truncate rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            {node.data.label}
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t p-4">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={duplicateSelectedNodes} disabled={isRunning}>
          <Copy aria-hidden="true" />
          Duplicate nodes
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive w-full"
          onClick={removeSelectedNodes}
          disabled={isRunning}
        >
          <Trash2 aria-hidden="true" />
          Delete nodes
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={clearSelection}>
          <X aria-hidden="true" />
          Clear selection
        </Button>
      </div>
    </div>
  );
};
