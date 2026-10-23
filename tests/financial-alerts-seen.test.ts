import assert from "node:assert/strict";
import { test } from "node:test";

import { countUnseenUrgent, isUnseenAlert, markAlertsSeen } from "@/helpers/financial-alerts-seen";
import type { FinancialAlertDto } from "@/types/revenue";

const alert = (id: string, type: FinancialAlertDto["type"], count: number | null = null): FinancialAlertDto => ({
  id,
  type,
  title: id,
  description: id,
  scope: "Now",
  count,
});

const lapsed = alert("lapsed-subscriptions", "danger", 3);
const churn = alert("churn-rising", "warning");
const renewals = alert("renewals-due", "info", 56);

test("every urgent alert is new before the admin has looked", () => {
  assert.equal(countUnseenUrgent([lapsed, churn, renewals], {}), 2, "info alerts never count toward the badge");
});

test("opening the list clears the badge", () => {
  const seen = markAlertsSeen([lapsed, churn, renewals]);
  assert.equal(countUnseenUrgent([lapsed, churn, renewals], seen), 0);
});

test("a growing count makes an alert new again, a shrinking one does not", () => {
  const seen = markAlertsSeen([lapsed]);
  assert.equal(isUnseenAlert({ ...lapsed, count: 5 }, seen), true);
  assert.equal(isUnseenAlert({ ...lapsed, count: 2 }, seen), false);
  assert.equal(isUnseenAlert(lapsed, seen), false);
});

test("a rule that cleared and fires again is new again", () => {
  const seenWithChurn = markAlertsSeen([lapsed, churn]);
  assert.equal(isUnseenAlert(churn, seenWithChurn), false);

  const seenAfterChurnCleared = markAlertsSeen([lapsed]);
  assert.equal(isUnseenAlert(churn, seenAfterChurnCleared), true);
});
