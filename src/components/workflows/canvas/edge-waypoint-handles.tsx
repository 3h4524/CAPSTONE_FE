"use client";

import { useTranslation } from "react-i18next";

import { insertWaypoint, midpoint, snapWaypoint, stepWaypoints } from "@/helpers/edge-waypoints";
import { useEdgeWaypointDrag } from "@/hooks/use-edge-waypoint-drag";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowPosition } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { EdgeLabelRenderer } from "@xyflow/react";

type EdgeWaypointHandlesProps = {
  edgeId: string;
  source: WorkflowPosition;
  target: WorkflowPosition;
  waypoints: WorkflowPosition[];
  stepCenter: WorkflowPosition;
};

const HANDLE_CLASS_NAME =
  "nodrag nopan pointer-events-auto absolute top-0 left-0 rounded-full border-2 shadow-sm transition-transform hover:scale-125";

const at = (point: WorkflowPosition) => ({ transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)` });

export const EdgeWaypointHandles = ({ edgeId, source, target, waypoints, stepCenter }: EdgeWaypointHandlesProps) => {
  const { t } = useTranslation("common");
  const startDrag = useEdgeWaypointDrag(edgeId);
  const updateEdgeWaypoints = useWorkflowStore((state) => state.updateEdgeWaypoints);
  const points = [source, ...waypoints, target];

  const moveWaypoint = (list: WorkflowPosition[], index: number) => (point: WorkflowPosition) => {
    const all = [source, ...list, target];
    return list.map((waypoint, position) =>
      position === index ? snapWaypoint(point, [all[index], all[index + 2]]) : waypoint
    );
  };

  return (
    <EdgeLabelRenderer>
      {waypoints.length === 0 ? (
        <button
          type="button"
          aria-label={t("workflowEditor.canvas.bendEdge")}
          title={t("workflowEditor.canvas.bendEdge")}
          className={cn(HANDLE_CLASS_NAME, "bg-wf-surface border-wf-accent size-3 cursor-move")}
          style={at(stepCenter)}
          onPointerDown={(event) => startDrag(event, (point) => stepWaypoints(source, target, point))}
        />
      ) : (
        <>
          {points.slice(0, -1).map((start, segment) => {
            const ghost = midpoint(start, points[segment + 1]);
            return (
              <button
                key={`segment-${segment}`}
                type="button"
                aria-label={t("workflowEditor.canvas.addBend")}
                title={t("workflowEditor.canvas.addBend")}
                className={cn(HANDLE_CLASS_NAME, "bg-wf-accent/40 size-2.5 cursor-copy border-transparent")}
                style={at(ghost)}
                onPointerDown={(event) =>
                  startDrag(event, moveWaypoint(insertWaypoint(waypoints, segment, ghost), segment))
                }
              />
            );
          })}
          {waypoints.map((waypoint, index) => (
            <button
              key={`waypoint-${index}`}
              type="button"
              aria-label={t("workflowEditor.canvas.moveBend")}
              title={t("workflowEditor.canvas.moveBend")}
              className={cn(HANDLE_CLASS_NAME, "bg-wf-surface border-wf-accent size-3 cursor-move")}
              style={at(waypoint)}
              onPointerDown={(event) => startDrag(event, moveWaypoint(waypoints, index))}
              onDoubleClick={(event) => {
                event.stopPropagation();
                updateEdgeWaypoints(
                  edgeId,
                  waypoints.filter((_, position) => position !== index)
                );
              }}
            />
          ))}
        </>
      )}
    </EdgeLabelRenderer>
  );
};
