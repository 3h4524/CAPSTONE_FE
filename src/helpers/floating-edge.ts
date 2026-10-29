import { Position } from "@xyflow/react";

export type EdgeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FloatingEdgeParams = {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
};

type BorderPoint = {
  x: number;
  y: number;
  position: Position;
};

const getBorderPoint = (from: EdgeRect, to: EdgeRect): BorderPoint => {
  const halfWidth = from.width / 2;
  const halfHeight = from.height / 2;
  const fromX = from.x + halfWidth;
  const fromY = from.y + halfHeight;
  const deltaX = to.x + to.width / 2 - fromX;
  const deltaY = to.y + to.height / 2 - fromY;
  if (deltaX === 0 && deltaY === 0) return { x: fromX, y: fromY, position: Position.Bottom };
  const horizontalRatio = Math.abs(deltaX) / halfWidth;
  const verticalRatio = Math.abs(deltaY) / halfHeight;
  const scale = 1 / Math.max(horizontalRatio, verticalRatio);
  const position =
    horizontalRatio > verticalRatio
      ? deltaX > 0
        ? Position.Right
        : Position.Left
      : deltaY > 0
        ? Position.Bottom
        : Position.Top;
  return { x: fromX + deltaX * scale, y: fromY + deltaY * scale, position };
};

export const getFloatingEdgeParams = (source: EdgeRect, target: EdgeRect): FloatingEdgeParams => {
  const start = getBorderPoint(source, target);
  const end = getBorderPoint(target, source);
  return {
    sourceX: start.x,
    sourceY: start.y,
    sourcePosition: start.position,
    targetX: end.x,
    targetY: end.y,
    targetPosition: end.position,
  };
};
