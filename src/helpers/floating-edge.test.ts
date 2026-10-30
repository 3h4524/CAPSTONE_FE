import { describe, expect, it } from "vitest";

import { getFloatingEdgeParams } from "@/helpers/floating-edge";
import { Position } from "@xyflow/react";

const rect = (x: number, y: number, width = 240, height = 100) => ({ x, y, width, height });

describe("getFloatingEdgeParams", () => {
  it("joins side by side nodes on their facing vertical sides", () => {
    const params = getFloatingEdgeParams(rect(0, 0), rect(320, 0));

    expect(params.sourcePosition).toBe(Position.Right);
    expect(params.targetPosition).toBe(Position.Left);
    expect(params.sourceX).toBe(240);
    expect(params.targetX).toBe(320);
    expect(params.sourceY).toBe(50);
    expect(params.targetY).toBe(50);
  });

  it("joins stacked nodes on their facing horizontal sides", () => {
    const params = getFloatingEdgeParams(rect(0, 0), rect(0, 320));

    expect(params.sourcePosition).toBe(Position.Bottom);
    expect(params.targetPosition).toBe(Position.Top);
    expect(params.sourceY).toBe(100);
    expect(params.targetY).toBe(320);
  });

  it("goes right to left when the target sits to the left", () => {
    const params = getFloatingEdgeParams(rect(640, 320), rect(320, 320));

    expect(params.sourcePosition).toBe(Position.Left);
    expect(params.targetPosition).toBe(Position.Right);
  });

  it("goes upward when the target sits above", () => {
    const params = getFloatingEdgeParams(rect(0, 320), rect(0, 0));

    expect(params.sourcePosition).toBe(Position.Top);
    expect(params.targetPosition).toBe(Position.Bottom);
  });

  it("keeps both ends on the border of nodes of different size", () => {
    const params = getFloatingEdgeParams(rect(0, 0, 240, 100), rect(400, 200, 288, 160));

    expect(params.sourceX).toBeGreaterThanOrEqual(0);
    expect(params.sourceX).toBeLessThanOrEqual(240);
    expect(params.sourceY).toBeGreaterThanOrEqual(0);
    expect(params.sourceY).toBeLessThanOrEqual(100);
    expect(params.targetX).toBeGreaterThanOrEqual(400);
    expect(params.targetX).toBeLessThanOrEqual(688);
    expect(params.targetY).toBeGreaterThanOrEqual(200);
    expect(params.targetY).toBeLessThanOrEqual(360);
  });

  it("does not return NaN when both nodes share the same center", () => {
    const params = getFloatingEdgeParams(rect(0, 0), rect(0, 0));

    expect(Number.isNaN(params.sourceX)).toBe(false);
    expect(Number.isNaN(params.targetY)).toBe(false);
  });
});
