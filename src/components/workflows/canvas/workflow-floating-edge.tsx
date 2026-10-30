"use client";

import { type EdgeRect,getFloatingEdgeParams } from "@/helpers/floating-edge";
import { BaseEdge, type EdgeProps, getBezierPath, type InternalNode,useInternalNode } from "@xyflow/react";

const getRect = (node: InternalNode | undefined): EdgeRect | null => {
  const { width, height } = node?.measured ?? {};
  if (!node || !width || !height) return null;
  const { x, y } = node.internals.positionAbsolute;
  return { x, y, width, height };
};

export const WorkflowFloatingEdge = ({ id, source, target, markerEnd, selected, style }: EdgeProps) => {
  const sourceRect = getRect(useInternalNode(source));
  const targetRect = getRect(useInternalNode(target));
  if (!sourceRect || !targetRect) return null;
  const params = getFloatingEdgeParams(sourceRect, targetRect);
  const [path] = getBezierPath(params);

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke: selected ? "var(--wf-accent)" : "var(--wf-faint)",
        strokeWidth: selected ? 2 : 1.5,
        ...style,
      }}
    />
  );
};
