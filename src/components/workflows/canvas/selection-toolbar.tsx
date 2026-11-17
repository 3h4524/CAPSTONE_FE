"use client";

import { Copy, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/stores/workflow";

export const SelectionToolbar = () => {
  const { t } = useTranslation("common");
  const selectedCount = useWorkflowStore((state) => state.selectedNodeIds.length);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const duplicateSelectedNodes = useWorkflowStore((state) => state.duplicateSelectedNodes);
  const removeSelectedNodes = useWorkflowStore((state) => state.removeSelectedNodes);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);

  if (selectedCount < 2) return null;

  return (
    <div
      role="toolbar"
      aria-label={t("workflowEditor.selection.nodesSelected", { count: selectedCount })}
      className="bg-card absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border py-1 pr-1 pl-3 shadow-lg"
    >
      <span className="text-ink-700 text-xs font-semibold whitespace-nowrap">
        {t("workflowEditor.selection.selected", { count: selectedCount })}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("workflowEditor.shortcuts.duplicateSelected")}
        onClick={duplicateSelectedNodes}
        disabled={isRunning}
      >
        <Copy aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("workflowEditor.shortcuts.deleteSelected")}
        onClick={removeSelectedNodes}
        disabled={isRunning}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("workflowEditor.shortcuts.clearSelection")}
        onClick={clearSelection}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
};
