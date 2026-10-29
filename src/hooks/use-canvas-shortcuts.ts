"use client";

import { useEffect } from "react";

import { showWorkflowActionToast } from "@/helpers/toast";
import { useWorkflowStore } from "@/stores/workflow";

const CANVAS_SELECTOR = ".react-flow";

type CanvasShortcutsProps = {
  saveWorkflow: () => void;
};

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const isOutsideCanvas = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return true;
  if (target.closest('[role="dialog"]')) return true;
  const canvas = document.querySelector(CANVAS_SELECTOR);
  return !canvas || (!canvas.contains(target) && target !== document.body);
};

export const useCanvasShortcuts = ({ saveWorkflow }: CanvasShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const { clearSelection, clipboard, copySelectedNodes, duplicateSelectedNodes, isRunning, pasteNodes, redo, selectAllNodes, selectedNodeIds, undo } =
        useWorkflowStore.getState();
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!(event.target instanceof Element && event.target.closest('[role="dialog"]'))) saveWorkflow();
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (modifier && event.key.toLowerCase() === "a" && !isOutsideCanvas(event.target)) {
        event.preventDefault();
        selectAllNodes();
        return;
      }
      // With no node selected, or with text selected on the page, Ctrl+C copies as it always does.
      if (modifier && event.key.toLowerCase() === "c" && !isOutsideCanvas(event.target) && selectedNodeIds.length > 0 && !window.getSelection()?.toString()) {
        event.preventDefault();
        copySelectedNodes();
        showWorkflowActionToast("success", `Copied ${selectedNodeIds.length} node${selectedNodeIds.length === 1 ? "" : "s"}. Paste them with Ctrl+V.`);
        return;
      }
      if (modifier && event.key.toLowerCase() === "v" && !isOutsideCanvas(event.target) && clipboard) {
        event.preventDefault();
        if (!isRunning) pasteNodes();
        return;
      }
      if (modifier && event.key.toLowerCase() === "d" && !isOutsideCanvas(event.target)) {
        event.preventDefault();
        if (!isRunning) duplicateSelectedNodes();
        return;
      }
      if (modifier && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        if (!isRunning) redo();
        return;
      }
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (!isRunning) undo();
        return;
      }
      if (event.key === "Escape" && !modifier) clearSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveWorkflow]);
};
