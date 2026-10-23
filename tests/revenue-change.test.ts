import assert from "node:assert/strict";
import { test } from "node:test";

import { changeTone, formatChange } from "@/helpers/revenue-change";

test("a change from an empty previous period is not reported as +100%", () => {
  assert.equal(formatChange(null, 819.92), "New");
  assert.equal(formatChange(null, 0), "—");
  assert.equal(formatChange(undefined, 5), "New");
});

test("a change against a non-empty previous period is signed and rounded", () => {
  assert.equal(formatChange(12.345, 10), "+12.3%");
  assert.equal(formatChange(-40, 6), "-40%");
  assert.equal(formatChange(0, 10), "0%");
});

test("a rate's change is shown in percentage points", () => {
  assert.equal(formatChange(-1.94, 6.9, " pp"), "-1.9 pp");
  assert.equal(formatChange(2, 8, " pp"), "+2 pp");
  assert.equal(formatChange(0, 8, " pp"), "0 pp");
});

test("revenue rising is good, falling is bad", () => {
  assert.equal(changeTone(15), "good");
  assert.equal(changeTone(-15), "bad");
});

test("refunds and churn falling is good, rising is bad", () => {
  assert.equal(changeTone(-15, "lower-is-better"), "good");
  assert.equal(changeTone(15, "lower-is-better"), "bad");
});

test("no change or no comparable previous period is neutral", () => {
  assert.equal(changeTone(0), "neutral");
  assert.equal(changeTone(0, "lower-is-better"), "neutral");
  assert.equal(changeTone(null, "lower-is-better"), "neutral");
});
