"use client";

import { Copy, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/stores/workflow";

export const SelectionToolbar = () => {
  const selectedCount = useWorkflowStore((state) => state.selectedNodeIds.length);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const duplicateSelectedNodes = useWorkflowStore((state) => state.duplicateSelectedNodes);
  const removeSelectedNodes = useWorkflowStore((state) => state.removeSelectedNodes);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  if (selectedCount < 2) return null;

  return (
    <div
      role="toolbar"
      aria-label={`${selectedCount} nodes selected`}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-white py-1 pr-1 pl-3 shadow-lg"
    >
      <span className="text-xs font-semibold whitespace-nowrap text-slate-700">{selectedCount} selected</span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate selected nodes" onClick={duplicateSelectedNodes} disabled={isRunning}>
        <Copy aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete selected nodes" onClick={removeSelectedNodes} disabled={isRunning} className="text-destructive hover:text-destructive">
        <Trash2 aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={clearSelection}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
};
