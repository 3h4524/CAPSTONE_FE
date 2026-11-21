import { EDGE_WAYPOINT_ALIGN, EDGE_WAYPOINT_GRID } from "@/constants/workflow-edges";
import type { WorkflowPosition } from "@/types/workflow";

const isPoint = (value: unknown): value is WorkflowPosition =>
  typeof value === "object" &&
  value !== null &&
  "x" in value &&
  "y" in value &&
  typeof value.x === "number" &&
  typeof value.y === "number";

export const readWaypoints = (data: unknown): WorkflowPosition[] => {
  if (typeof data !== "object" || data === null || !("waypoints" in data) || !Array.isArray(data.waypoints)) return [];
  return data.waypoints.filter(isPoint);
};

const distance = (a: WorkflowPosition, b: WorkflowPosition) => Math.hypot(b.x - a.x, b.y - a.y);

const towards = (from: WorkflowPosition, to: WorkflowPosition, length: number) => {
  const total = distance(from, to);
  if (total === 0) return from;
  return { x: from.x + ((to.x - from.x) / total) * length, y: from.y + ((to.y - from.y) / total) * length };
};

export const buildRoundedPath = (points: WorkflowPosition[], radius: number) => {
  if (points.length < 2) return "";
  const [first] = points;
  const last = points[points.length - 1];
  let path = `M ${first.x} ${first.y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const round = Math.min(radius, distance(previous, corner) / 2, distance(corner, next) / 2);
    const start = towards(corner, previous, round);
    const end = towards(corner, next, round);
    path += ` L ${start.x} ${start.y} Q ${corner.x} ${corner.y} ${end.x} ${end.y}`;
  }
  return `${path} L ${last.x} ${last.y}`;
};

const distanceToSegment = (point: WorkflowPosition, a: WorkflowPosition, b: WorkflowPosition) => {
  const length = distance(a, b) ** 2;
  if (length === 0) return distance(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length));
  return distance(point, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
};

export const nearestSegment = (points: WorkflowPosition[], point: WorkflowPosition) => {
  let best = 0;
  for (let index = 1; index < points.length - 1; index++) {
    if (distanceToSegment(point, points[index], points[index + 1]) < distanceToSegment(point, points[best], points[best + 1]))
      best = index;
  }
  return best;
};

export const insertWaypoint = (waypoints: WorkflowPosition[], segment: number, point: WorkflowPosition) => [
  ...waypoints.slice(0, segment),
  point,
  ...waypoints.slice(segment),
];

export const snapWaypoint = (point: WorkflowPosition, neighbors: WorkflowPosition[]): WorkflowPosition => {
  const snapped = {
    x: Math.round(point.x / EDGE_WAYPOINT_GRID) * EDGE_WAYPOINT_GRID,
    y: Math.round(point.y / EDGE_WAYPOINT_GRID) * EDGE_WAYPOINT_GRID,
  };
  neighbors.forEach((neighbor) => {
    if (Math.abs(point.x - neighbor.x) <= EDGE_WAYPOINT_ALIGN) snapped.x = neighbor.x;
    if (Math.abs(point.y - neighbor.y) <= EDGE_WAYPOINT_ALIGN) snapped.y = neighbor.y;
  });
  return snapped;
};

export const stepWaypoints = (source: WorkflowPosition, target: WorkflowPosition, point: WorkflowPosition) =>
  Math.abs(source.x - target.x) < 1
    ? [snapWaypoint(point, [source, target])]
    : [
        { x: source.x, y: snapWaypoint(point, []).y },
        { x: target.x, y: snapWaypoint(point, []).y },
      ];

export const midpoint = (a: WorkflowPosition, b: WorkflowPosition) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const offsetWaypoints = (data: unknown, offset: number) => {
  const waypoints = readWaypoints(data);
  return waypoints.length > 0 ? waypoints.map((point) => ({ x: point.x + offset, y: point.y + offset })) : undefined;
};
