"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  findMergeTarget,
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

const MERGE_CLASS_NAME = "bg-wf-process border-wf-process ring-wf-process/35 scale-150 ring-4";

const at = (point: WorkflowPosition) => ({ left: point.x, top: point.y });

export const EdgeWaypointHandles = ({ edgeId, source, target, waypoints, pathCenter }: EdgeWaypointHandlesProps) => {
  const { t } = useTranslation("common");
  const startDrag = useEdgeWaypointDrag(edgeId);
  const updateEdgeWaypoints = useWorkflowStore((state) => state.updateEdgeWaypoints);
  const [dragging, setDragging] = useState<number | null>(null);
  const points = [source, ...waypoints, target];
  const mergeAt = (index: number) => (list: WorkflowPosition[]) => mergeDraggedWaypoint(list, index, source, target);
  const merge = dragging === null ? null : findMergeTarget(waypoints, dragging, source, target);
  const merging = (index: number) =>
    merge !== null && (index === dragging || (merge.kind === "waypoint" && merge.index === index));
  const endPoint = merge?.kind === "source" ? source : merge?.kind === "target" ? target : null;
  const dragAt =
    (index: number, list: WorkflowPosition[]) => (event: Parameters<typeof startDrag>[0]) => {
      setDragging(index);
      startDrag(event, moveWaypoint(list, index), mergeAt(index), () => setDragging(null));
    };

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
                onPointerDown={dragAt(segment, insertWaypoint(waypoints, segment, ghost))}
              />
            );
          })}
          {waypoints.map((waypoint, index) => (
            <button
              key={`waypoint-${index}`}
              type="button"
              aria-label={t("workflowEditor.canvas.moveBend")}
              className={cn(
                HANDLE_CLASS_NAME,
                "bg-wf-surface border-wf-accent size-3 cursor-move",
                merging(index) && MERGE_CLASS_NAME
              )}
              style={at(waypoint)}
              onPointerDown={dragAt(index, waypoints)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                updateEdgeWaypoints(
                  edgeId,
                  waypoints.filter((_, position) => position !== index)
                );
              }}
            />
          ))}
          {endPoint && (
            <span
              aria-hidden="true"
              className="border-wf-process bg-wf-process/20 ring-wf-process/30 pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ring-4 motion-safe:animate-pulse"
              style={at(endPoint)}
            />
          )}
        </>
      )}
    </EdgeLabelRenderer>
  );
};
