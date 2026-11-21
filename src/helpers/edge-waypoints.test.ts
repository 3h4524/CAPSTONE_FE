import { describe, expect, it } from "vitest";

import {
  buildRoundedPath,
  insertWaypoint,
  mergeDraggedWaypoint,
  nearestSegment,
  offsetWaypoints,
  readWaypoints,
  snapWaypoint,
  stepWaypoints,
} from "@/helpers/edge-waypoints";

describe("readWaypoints", () => {
  it("keeps only well-formed points", () => {
    expect(readWaypoints({ waypoints: [{ x: 1, y: 2 }, { x: "a", y: 3 }, null] })).toEqual([{ x: 1, y: 2 }]);
  });

  it("returns nothing for edges without waypoints", () => {
    expect(readWaypoints(undefined)).toEqual([]);
    expect(readWaypoints({ waypoints: null })).toEqual([]);
  });
});

describe("buildRoundedPath", () => {
  it("draws a straight line between two points", () => {
    expect(buildRoundedPath([{ x: 0, y: 0 }, { x: 0, y: 100 }], 14)).toBe("M 0 0 L 0 100");
  });

  it("rounds each corner without overshooting short segments", () => {
    const path = buildRoundedPath([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 10, y: 100 }], 14);
    expect(path).toBe("M 0 0 L 0 95 Q 0 100 5 100 L 10 100");
  });
});

describe("nearestSegment / insertWaypoint", () => {
  const points = [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }];

  it("finds the segment closest to a point", () => {
    expect(nearestSegment(points, { x: 5, y: 40 })).toBe(0);
    expect(nearestSegment(points, { x: 100, y: 95 })).toBe(1);
    expect(nearestSegment(points, { x: 205, y: 160 })).toBe(2);
  });

  it("inserts a waypoint where that segment is", () => {
    expect(insertWaypoint([{ x: 0, y: 100 }, { x: 200, y: 100 }], 1, { x: 100, y: 100 })).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);
  });
});

describe("snapWaypoint", () => {
  it("snaps to the grid", () => {
    expect(snapWaypoint({ x: 123, y: 87 }, [])).toEqual({ x: 120, y: 90 });
  });

  it("lines up with a nearby neighbor so segments stay straight", () => {
    expect(snapWaypoint({ x: 205, y: 147 }, [{ x: 201, y: 40 }])).toEqual({ x: 201, y: 150 });
  });
});

describe("stepWaypoints", () => {
  it("moves the horizontal segment of a step", () => {
    expect(stepWaypoints({ x: 0, y: 0 }, { x: 200, y: 300 }, { x: 90, y: 182 })).toEqual([
      { x: 0, y: 180 },
      { x: 200, y: 180 },
    ]);
  });

  it("bends a straight edge at the dragged point", () => {
    expect(stepWaypoints({ x: 0, y: 0 }, { x: 0, y: 300 }, { x: 92, y: 150 })).toEqual([{ x: 90, y: 150 }]);
  });
});

describe("offsetWaypoints", () => {
  it("moves copied waypoints with the copied nodes", () => {
    expect(offsetWaypoints({ waypoints: [{ x: 10, y: 20 }] }, 48)).toEqual([{ x: 58, y: 68 }]);
    expect(offsetWaypoints({}, 48)).toBeUndefined();
  });
});

describe("mergeDraggedWaypoint", () => {
  const source = { x: 0, y: 0 };
  const target = { x: 400, y: 400 };

  it("merges a bend dropped on the next bend into one", () => {
    const waypoints = [{ x: 0, y: 100 }, { x: 196, y: 104 }, { x: 200, y: 100 }, { x: 400, y: 300 }];
    expect(mergeDraggedWaypoint(waypoints, 1, source, target)).toEqual([
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 400, y: 300 },
    ]);
  });

  it("merges a bend dropped on the previous bend and drops the loop between them", () => {
    const waypoints = [{ x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 3, y: 97 }];
    expect(mergeDraggedWaypoint(waypoints, 3, source, target)).toEqual([{ x: 0, y: 100 }]);
  });

  it("removes a bend dropped on either end of the edge", () => {
    const waypoints = [{ x: 2, y: 3 }, { x: 200, y: 100 }];
    expect(mergeDraggedWaypoint(waypoints, 0, source, target)).toEqual([{ x: 200, y: 100 }]);
    expect(mergeDraggedWaypoint([{ x: 200, y: 100 }, { x: 398, y: 404 }], 1, source, target)).toEqual([
      { x: 200, y: 100 },
    ]);
  });

  it("keeps bends that are apart", () => {
    const waypoints = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
    expect(mergeDraggedWaypoint(waypoints, 1, source, target)).toEqual(waypoints);
  });
});
