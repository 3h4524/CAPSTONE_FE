import { describe, expect, it } from "vitest";

import { usdToVnd, vndToUsd } from "@/helpers/plan-price";

const RATE = 25_000;

describe("vndToUsd", () => {
  it("converts at the given rate", () => {
    expect(vndToUsd(249_750, RATE)).toBe(9.99);
  });

  it("keeps at most two decimals", () => {
    expect(vndToUsd(123_456, RATE)).toBe(4.94);
  });

  it("rounds half up past two decimals", () => {
    expect(vndToUsd(12_650, RATE)).toBe(0.51);
  });

  it("returns zero for zero", () => {
    expect(vndToUsd(0, RATE)).toBe(0);
  });

  it("round trips a whole-ten thousand VND amount", () => {
    expect(vndToUsd(100_000, RATE)).toBe(4);
    expect(usdToVnd(4, RATE)).toBe(100_000);
  });
});

describe("usdToVnd", () => {
  it("converts at the given rate", () => {
    expect(usdToVnd(9.99, RATE)).toBe(249_750);
  });

  it("rounds to whole đồng", () => {
    expect(usdToVnd(4.004, RATE)).toBe(100_100);
  });

  it("returns zero for zero", () => {
    expect(usdToVnd(0, RATE)).toBe(0);
  });

  it("round trips a two-decimal USD amount", () => {
    expect(vndToUsd(usdToVnd(9.99, RATE), RATE)).toBe(9.99);
  });
});
