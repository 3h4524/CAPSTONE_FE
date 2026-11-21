"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowPosition } from "@/types/workflow";
import { useReactFlow } from "@xyflow/react";

export const useEdgeWaypointDrag = (edgeId: string) => {
  const { screenToFlowPosition } = useReactFlow();
  const beginEdgeEdit = useWorkflowStore((state) => state.beginEdgeEdit);
  const setEdgeWaypoints = useWorkflowStore((state) => state.setEdgeWaypoints);
  const commitEdgeEdit = useWorkflowStore((state) => state.commitEdgeEdit);

  return (event: ReactPointerEvent, toWaypoints: (point: WorkflowPosition) => WorkflowPosition[]) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    beginEdgeEdit();
    const move = (moveEvent: PointerEvent) =>
      setEdgeWaypoints(edgeId, toWaypoints(screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY })));
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      commitEdgeEdit();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };
};
