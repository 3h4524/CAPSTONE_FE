import { describe, expect, it } from "vitest";

import { cubicBezier } from "@/utils/cubic-bezier";

describe("cubicBezier", () => {
  const ease = cubicBezier(0.22, 0.8, 0.2, 1);

  it("starts at 0 and ends at 1", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it("eases out: most of the move happens early", () => {
    expect(ease(0.25)).toBeGreaterThan(0.5);
    expect(ease(0.5)).toBeGreaterThan(ease(0.25));
    expect(ease(0.9)).toBeLessThanOrEqual(1);
  });

  it("matches a linear curve when the control points sit on the diagonal", () => {
    expect(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.4)).toBeCloseTo(0.4, 3);
  });
});
