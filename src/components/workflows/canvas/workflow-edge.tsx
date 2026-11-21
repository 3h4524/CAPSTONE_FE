"use client";

import type { MouseEvent } from "react";

import { EdgeWaypointHandles } from "@/components/workflows/canvas/edge-waypoint-handles";
import { ProcessToken } from "@/components/workflows/canvas/process-token";
import { EDGE_CORNER_RADIUS, EDGE_HANDLE_OFFSET } from "@/constants/workflow-edges";
import {
  buildRoundedPath,
  insertWaypoint,
  nearestSegment,
  readWaypoints,
  snapWaypoint,
  stepWaypoints,
} from "@/helpers/edge-waypoints";
import { useProcessTravel } from "@/hooks/use-process-travel";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowCanvasEdge } from "@/types/workflow";
import { BaseEdge, type EdgeProps, getSmoothStepPath, useReactFlow } from "@xyflow/react";

const strokeFor = (selected: boolean, lit: boolean) => {
  if (selected) return "var(--wf-accent)";
  return lit ? "var(--wf-process)" : "var(--wf-edge)";
};

export const WorkflowEdge = ({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  selected = false,
  style,
}: EdgeProps<WorkflowCanvasEdge>) => {
  const effects = data?.effects === true;
  const passed = data?.sourceStatus === "success";
  const { travel, arrive } = useProcessTravel(passed, effects);
  const { screenToFlowPosition } = useReactFlow();
  const updateEdgeWaypoints = useWorkflowStore((state) => state.updateEdgeWaypoints);
  const editable = data?.editable === true;
  const waypoints = readWaypoints(data);
  const source = { x: sourceX, y: sourceY };
  const target = { x: targetX, y: targetY };
  const [stepPath, stepCenterX, stepCenterY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_CORNER_RADIUS,
    offset: EDGE_HANDLE_OFFSET,
  });
  const path =
    waypoints.length > 0 ? buildRoundedPath([source, ...waypoints, target], EDGE_CORNER_RADIUS) : stepPath;

  const addBend = (event: MouseEvent<SVGPathElement>) => {
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const current = waypoints.length > 0 ? waypoints : stepWaypoints(source, target, { x: stepCenterX, y: stepCenterY });
    const all = [source, ...current, target];
    const segment = nearestSegment(all, point);
    updateEdgeWaypoints(id, insertWaypoint(current, segment, snapWaypoint(point, [all[segment], all[segment + 1]])));
  };
  const lit = effects && travel === "arrived";
  const docked = lit && data?.targetStatus === "idle";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: strokeFor(selected, lit),
          strokeWidth: selected || lit ? 2.25 : 1.75,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          transition: "stroke 0.35s ease",
          ...style,
        }}
      />
      {editable && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={18}
          className="nopan cursor-crosshair"
          onDoubleClick={addBend}
        />
      )}
      {editable && selected && (
        <EdgeWaypointHandles
          edgeId={id}
          source={source}
          target={target}
          waypoints={waypoints}
          stepCenter={{ x: stepCenterX, y: stepCenterY }}
        />
      )}
      {effects && travel === "travelling" && <ProcessToken edgeId={id} path={path} onArrive={arrive} />}
      {docked && (
        <g className="pointer-events-none" transform={`translate(${targetX} ${targetY})`}>
          <circle r={10} className="fill-wf-process/30 animate-wf-process-breathe" />
          <circle r={4.5} className="fill-wf-process stroke-wf-surface [stroke-width:1.5]" />
        </g>
      )}
    </>
  );
};
