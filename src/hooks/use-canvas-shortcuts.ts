"use client";

import { useEffect } from "react";

import { useWorkflowStore } from "@/stores/workflow";

const CANVAS_SELECTOR = ".react-flow";

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const isOutsideCanvas = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return true;
  if (target.closest('[role="dialog"]')) return true;
  const canvas = document.querySelector(CANVAS_SELECTOR);
  return !canvas || (!canvas.contains(target) && target !== document.body);
};

export const useCanvasShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      const { clearSelection, duplicateSelectedNodes, isRunning, selectAllNodes } = useWorkflowStore.getState();
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "a" && !isOutsideCanvas(event.target)) {
        event.preventDefault();
        selectAllNodes();
        return;
      }
      if (modifier && event.key.toLowerCase() === "d" && !isOutsideCanvas(event.target)) {
        event.preventDefault();
        if (!isRunning) duplicateSelectedNodes();
        return;
      }
      if (event.key === "Escape" && !modifier) clearSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
};
