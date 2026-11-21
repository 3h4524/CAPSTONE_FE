"use client";

import { useTranslation } from "react-i18next";

import {
  insertWaypoint,
  mergeDraggedWaypoint,
  midpoint,
  snapWaypoint,
  stepWaypoints,
} from "@/helpers/edge-waypoints";
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
  pathCenter: WorkflowPosition | null;
};

const HANDLE_CLASS_NAME =
  "nodrag nopan pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-[scale,background-color] hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wf-accent before:absolute before:top-1/2 before:left-1/2 before:size-6 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:content-[''] [@media(pointer:coarse)]:before:size-11";

const at = (point: WorkflowPosition) => ({ left: point.x, top: point.y });

export const EdgeWaypointHandles = ({ edgeId, source, target, waypoints, pathCenter }: EdgeWaypointHandlesProps) => {
  const { t } = useTranslation("common");
  const startDrag = useEdgeWaypointDrag(edgeId);
  const updateEdgeWaypoints = useWorkflowStore((state) => state.updateEdgeWaypoints);
  const points = [source, ...waypoints, target];
  const mergeAt = (index: number) => (list: WorkflowPosition[]) => mergeDraggedWaypoint(list, index, source, target);

  const moveWaypoint = (list: WorkflowPosition[], index: number) => (point: WorkflowPosition) => {
    const all = [source, ...list, target];
    return list.map((waypoint, position) =>
      position === index ? snapWaypoint(point, [all[index], all[index + 2]]) : waypoint
    );
  };

  return (
    <EdgeLabelRenderer>
      {waypoints.length === 0 ? (
        pathCenter && (
        <button
          type="button"
          aria-label={t("workflowEditor.canvas.bendEdge")}
          className={cn(HANDLE_CLASS_NAME, "bg-wf-surface border-wf-accent size-3 cursor-move")}
          style={at(pathCenter)}
          onPointerDown={(event) => startDrag(event, (point) => stepWaypoints(source, target, point))}
        />
        )
      ) : (
        <>
          {points.slice(0, -1).map((start, segment) => {
            const ghost = midpoint(start, points[segment + 1]);
            return (
              <button
                key={`segment-${segment}`}
                type="button"
                aria-label={t("workflowEditor.canvas.addBend")}
                className={cn(HANDLE_CLASS_NAME, "bg-wf-accent/40 size-2.5 cursor-copy border-transparent")}
                style={at(ghost)}
                onPointerDown={(event) =>
                  startDrag(event, moveWaypoint(insertWaypoint(waypoints, segment, ghost), segment), mergeAt(segment))
                }
              />
            );
          })}
          {waypoints.map((waypoint, index) => (
            <button
              key={`waypoint-${index}`}
              type="button"
              aria-label={t("workflowEditor.canvas.moveBend")}
              className={cn(HANDLE_CLASS_NAME, "bg-wf-surface border-wf-accent size-3 cursor-move")}
              style={at(waypoint)}
              onPointerDown={(event) => startDrag(event, moveWaypoint(waypoints, index), mergeAt(index))}
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
