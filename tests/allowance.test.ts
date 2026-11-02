import assert from "node:assert/strict";
import { test } from "node:test";

import { allowanceBlocksRun, allowanceLine, allowanceResetLine, formatAllowanceDate } from "@/helpers/allowance";
import type { Allowances } from "@/types/allowance";

const free = (used: Partial<Record<string, number>> = {}): Allowances => ({
  scope: "free",
  resetsOn: "2026-12-01",
  mockupsPerRun: 3,
  items: [
    { code: "full_runs", label: "full runs", used: used.full_runs ?? 0, limit: 2 },
    { code: "design_runs", label: "design runs", used: used.design_runs ?? 0, limit: 5 },
    { code: "design_images", label: "design images", used: used.design_images ?? 0, limit: 7 },
    { code: "mockups", label: "mockups", used: used.mockups ?? 0, limit: 6 },
    { code: "videos", label: "videos", used: used.videos ?? 0, limit: 2 },
    { code: "listings", label: "listings", used: used.listings ?? 0, limit: 5 },
  ],
});

const run = { productCount: 1, variationCount: 1, templateCount: 3 };

test("a run within Free's allowances is not blocked", () => {
  assert.equal(allowanceBlocksRun(free(), run), null);
});

test("a run is blocked when Free's design runs are used up, with when they reset", () => {
  assert.equal(
    allowanceBlocksRun(free({ design_runs: 5 }), run),
    "This run needs 1 design runs, and Free has 0 of 5 left. They reset on 1 Dec 2026."
  );
});

test("more design images than are left blocks the run", () => {
  assert.match(allowanceBlocksRun(free({ design_images: 7 }), run) ?? "", /design images/);
});

test("more mockups than one Free run makes blocks the run", () => {
  assert.equal(
    allowanceBlocksRun(free(), { ...run, templateCount: 4 }),
    "Free makes up to 3 mockups per run, and this run would make 4. Choose fewer mock-up templates."
  );
});

test("a paid plan has no allowances to check", () => {
  assert.equal(allowanceBlocksRun({ scope: null, resetsOn: null, mockupsPerRun: null, items: [] }, run), null);
});

test("lines read as the banner shows them", () => {
  assert.equal(formatAllowanceDate("2026-12-01"), "1 Dec 2026");
  assert.equal(allowanceLine({ code: "full_runs", label: "full runs", used: 1, limit: 2 }), "1 of 2 full runs left");
  assert.equal(allowanceResetLine(free()), "Resets 1 Dec 2026");
  assert.equal(allowanceResetLine({ ...free(), scope: "trial", resetsOn: "2026-11-14" }), "Trial ends 14 Nov 2026");
});
