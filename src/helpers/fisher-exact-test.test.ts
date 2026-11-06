import { describe, expect, it } from "vitest";

import { getFisherExactPValue } from "@/helpers/fisher-exact-test";

describe("getFisherExactPValue", () => {
  it.each([
    { table: [0, 8, 8, 0], expected: 2 / 12870 },
    { table: [6, 2, 8, 0], expected: 0.4666666667 },
    { table: [4, 8, 10, 0], expected: 0.001688713763 },
    { table: [7, 1, 7, 1], expected: 1 },
    { table: [8, 0, 8, 0], expected: 1 },
  ])("returns $expected for $table", ({ table, expected }) => {
    const [firstYes = 0, firstNo = 0, secondYes = 0, secondNo = 0] = table;

    const pValue = getFisherExactPValue(firstYes, firstNo, secondYes, secondNo);

    expect(pValue).toBeCloseTo(expected, 9);
  });

  it("returns 1 when one side has no images", () => {
    expect(getFisherExactPValue(0, 0, 3, 1)).toBe(1);
  });

  it("gives the same answer when the sides swap", () => {
    expect(getFisherExactPValue(2, 6, 7, 1)).toBeCloseTo(getFisherExactPValue(7, 1, 2, 6), 12);
  });
});
