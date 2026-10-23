import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatRangeDate,
  formatTransactionDate,
  getPageItems,
  getTransactionStatusStyle,
} from "@/helpers/revenue-transactions";

test("the pager shows the edges, the current page's neighbours and gaps", () => {
  assert.deepEqual(getPageItems(1, 31), [1, 2, 3, "…", 31]);
  assert.deepEqual(getPageItems(15, 31), [1, "…", 14, 15, 16, "…", 31]);
  assert.deepEqual(getPageItems(31, 31), [1, "…", 29, 30, 31]);
  assert.deepEqual(getPageItems(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(getPageItems(1, 0), []);
});

test("a transaction date shows the checkout time only when it falls on the payment day", () => {
  const sameDay = new Date(2026, 9, 30, 11, 20).toISOString();
  const otherDay = new Date(2026, 9, 28, 9, 5).toISOString();

  assert.equal(formatTransactionDate("2026-10-30", sameDay), "30 Oct 2026 11:20");
  assert.equal(formatTransactionDate("2026-10-30", otherDay), "30 Oct 2026");
  assert.equal(formatTransactionDate("2026-10-30", null), "30 Oct 2026");
  assert.equal(formatTransactionDate(null), "—");
});

test("the filter range reads like the mockup", () => {
  assert.equal(formatRangeDate("2026-10-01"), "Oct 01, 2026");
});

test("known statuses get their label and unknown ones a neutral pill", () => {
  assert.equal(getTransactionStatusStyle("pending").label, "Pending");
  assert.equal(getTransactionStatusStyle("refunded").label, "Refunded");
  assert.equal(getTransactionStatusStyle("disputed").label, "Disputed");
});
