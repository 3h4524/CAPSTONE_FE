"use client";

import { ProcessToken } from "@/components/workflows/canvas/process-token";
import { useProcessTravel } from "@/hooks/use-process-travel";
import type { WorkflowCanvasEdge } from "@/types/workflow";
import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

const EDGE_CURVATURE = 0.35;

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
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: EDGE_CURVATURE,
  });
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
          transition: "stroke 0.35s ease",
          ...style,
        }}
      />
      {effects && travel === "travelling" && <ProcessToken path={path} onArrive={arrive} />}
      {docked && (
        <g className="pointer-events-none" transform={`translate(${targetX} ${targetY})`}>
          <circle r={10} className="fill-wf-process/30 animate-wf-process-breathe" />
          <circle r={4.5} className="fill-wf-process stroke-wf-surface [stroke-width:1.5]" />
        </g>
      )}
    </>
  );
};
