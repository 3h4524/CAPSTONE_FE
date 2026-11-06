import { describe, expect, it } from "vitest";

import { formatCompactVndAmount, formatVnd } from "@/utils/format-currency";

// Intl separates the number and the sign with a no-break space.
const plain = (value: string) => value.replace(/\s/g, " ");

describe("formatVnd", () => {
  it("formats whole dong with Vietnamese grouping", () => {
    expect(plain(formatVnd(249750))).toBe("249.750 ₫");
  });

  it("rounds to whole dong", () => {
    expect(plain(formatVnd(1000.6))).toBe("1.001 ₫");
  });

  it.each([null, undefined, Number.NaN])("shows zero for %s", (value) => {
    expect(formatVnd(value)).toBe("0 ₫");
  });
});

describe("formatCompactVndAmount", () => {
  it.each([
    [2118811000, "2.1B ₫"],
    [176567583, "176.6M ₫"],
    [249750, "250K ₫"],
    [999, "999 ₫"],
    [2000000, "2M ₫"],
  ])("shortens %d", (value, expected) => {
    expect(formatCompactVndAmount(value)).toBe(expected);
  });

  it("moves to the next unit rather than showing 1000", () => {
    expect(formatCompactVndAmount(999_500)).toBe("1M ₫");
    expect(formatCompactVndAmount(999_950_000)).toBe("1B ₫");
    expect(formatCompactVndAmount(999.5)).toBe("1K ₫");
  });

  it("keeps the sign of a negative amount", () => {
    expect(formatCompactVndAmount(-2500000)).toBe("-2.5M ₫");
    expect(formatCompactVndAmount(-500)).toBe("-500 ₫");
  });

  it.each([null, undefined, Number.NaN, 0])("shows zero for %s", (value) => {
    expect(formatCompactVndAmount(value)).toBe("0 ₫");
  });
});
