import { describe, expect, it } from "vitest";

import { bridgeRows, bridgeSummary, MRR_MOVEMENT_COLORS, signedVnd } from "@/helpers/revenue-mrr-movement";
import type { MrrBridgeDto } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

const bridge = (overrides: Partial<MrrBridgeDto> = {}): MrrBridgeDto =>
  ({
    planName: null,
    start: 1000,
    end: 1000,
    new: 0,
    movedIn: 0,
    expansion: 0,
    contraction: 0,
    movedOut: 0,
    churn: 0,
    ...overrides,
  }) as MrrBridgeDto;

describe("signedVnd", () => {
  it("signs an amount, treating zero as positive", () => {
    expect(signedVnd(1000)).toBe(`+${formatVnd(1000)}`);
    expect(signedVnd(-1000)).toBe(`−${formatVnd(1000)}`);
    expect(signedVnd(0)).toBe(`+${formatVnd(0)}`);
  });
});

describe("bridgeRows", () => {
  it("always lists New and Churn and hides causes that did not move MRR", () => {
    expect(bridgeRows(bridge()).map((x) => x.label)).toEqual(["New", "Churn"]);
  });

  it("makes what removed MRR negative and leaves out moves for all plans", () => {
    const rows = bridgeRows(bridge({ contraction: 50, movedIn: 30, movedOut: 20, churn: 10 }));
    expect(rows.map((x) => [x.label, x.value])).toEqual([
      ["New", 0],
      ["Contraction", -50],
      ["Churn", -10],
    ]);
  });

  it("shows customers moving in and out on a single plan", () => {
    const rows = bridgeRows(bridge({ planName: "Pro", movedIn: 30, movedOut: 20, expansion: 5 }));
    expect(rows.map((x) => x.label)).toEqual(["New", "Moved in", "Expansion", "Moved out", "Churn"]);
    expect(rows.find((x) => x.label === "Moved out")?.color).toBe(MRR_MOVEMENT_COLORS.contraction);
  });
});

describe("bridgeSummary", () => {
  it("says nothing changed", () => {
    expect(bridgeSummary(bridge())).toBe("Overall MRR held steady. Nothing changed in the period.");
  });

  it("reports growth with its percent, and that nothing was lost", () => {
    expect(bridgeSummary(bridge({ planName: "Pro", end: 1100, new: 100 }))).toBe(
      `Pro MRR grew ${formatVnd(100)} (+10.0%). New added ${formatVnd(100)} and nothing was lost.`
    );
  });

  it("reports a fall with nothing added", () => {
    expect(bridgeSummary(bridge({ end: 900, churn: 100 }))).toBe(
      `Overall MRR fell ${formatVnd(100)} (−10.0%). Churn removed ${formatVnd(100)} with nothing added.`
    );
  });

  it("names the biggest move each way", () => {
    const summary = bridgeSummary(bridge({ end: 1050, new: 200, expansion: 10, churn: 150, contraction: 10 }));
    expect(summary).toContain(`Churn removed ${formatVnd(150)} while new added ${formatVnd(200)}`);
  });

  it("gives no percent when MRR started at zero", () => {
    expect(bridgeSummary(bridge({ start: 0, end: 100, new: 100 }))).toBe(
      `Overall MRR grew ${formatVnd(100)}. New added ${formatVnd(100)} and nothing was lost.`
    );
  });
});
