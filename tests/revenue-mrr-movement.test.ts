import assert from "node:assert/strict";
import { test } from "node:test";

import { bridgeRows, bridgeSummary } from "@/helpers/revenue-mrr-movement";
import type { MrrBridgeDto } from "@/types/revenue";
import { formatCompactVndAmount, formatVnd } from "@/utils/format-currency";

const bridge = (overrides: Partial<MrrBridgeDto>): MrrBridgeDto => ({
  planName: null,
  start: 0,
  new: 0,
  movedIn: 0,
  expansion: 0,
  contraction: 0,
  movedOut: 0,
  churn: 0,
  end: 0,
  ...overrides,
});

// Intl separates the amount and the symbol with a non-breaking space; compare on plain spaces.
const plain = (text: string) => text.replaceAll(String.fromCharCode(160), " ");

test("all plans list New and Churn always and other causes only when they moved MRR", () => {
  const rows = bridgeRows(bridge({ start: 49_840_000, new: 7_574_000, expansion: 1_800_000, churn: 7_779_000, end: 51_435_000 }));

  assert.deepEqual(
    rows.map((row) => [row.label, row.value]),
    [
      ["New", 7_574_000],
      ["Expansion", 1_800_000],
      ["Churn", -7_779_000],
    ]
  );
});

test("one plan also shows customers moving in from and out to other plans", () => {
  const rows = bridgeRows(bridge({ planName: "Pro", movedIn: 2_994_000, movedOut: 1_996_000 }));

  assert.deepEqual(
    rows.map((row) => row.label),
    ["New", "Moved in", "Moved out", "Churn"]
  );
  assert.equal(rows.find((row) => row.label === "Moved out")!.value, -1_996_000);
});

test("the summary says how MRR changed and what moved it most each way", () => {
  const text = bridgeSummary(
    bridge({ planName: "Pro", start: 29_940_000, new: 3_992_000, movedIn: 2_994_000, movedOut: 1_996_000, churn: 5_988_000, end: 28_942_000 })
  );

  assert.equal(plain(text), "Pro MRR fell 998.000 ₫ (−3.3%). Churn removed 5.988.000 ₫ while new added 3.992.000 ₫.");
  assert.equal(plain(bridgeSummary(bridge({}))), "Overall MRR held steady. Nothing changed in the period.");
});

test("VND amounts are whole đồng, compact amounts use English unit suffixes", () => {
  assert.equal(plain(formatVnd(249_750.4)), "249.750 ₫");
  assert.equal(plain(formatVnd(null)), "0 ₫");
  assert.equal(formatCompactVndAmount(2_118_811_000), "2.1B ₫");
  assert.equal(formatCompactVndAmount(176_567_583), "176.6M ₫");
  assert.equal(formatCompactVndAmount(-8_746_250), "-8.7M ₫");
  assert.equal(formatCompactVndAmount(249_750), "250K ₫");
  assert.equal(formatCompactVndAmount(999_500), "1M ₫", "never 1000K");
  assert.equal(formatCompactVndAmount(999_960_000), "1B ₫", "never 1000M");
  assert.equal(formatCompactVndAmount(999), "999 ₫");
});
