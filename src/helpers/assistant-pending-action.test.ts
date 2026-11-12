import { describe, expect, it } from "vitest";

import { formatActionTimeLeft, getConflictedActionStatus } from "@/helpers/assistant-pending-action";

const responseError = (status: number, code?: string) => ({ response: { status, data: { code, detail: "x" } } });

describe("getConflictedActionStatus", () => {
  it("maps an expired conflict to expired and any other conflict to failed", () => {
    expect(getConflictedActionStatus(responseError(409, "assistant.action_expired"))).toBe("expired");
    expect(getConflictedActionStatus(responseError(409, "assistant.action_not_pending"))).toBe("failed");
  });

  it("returns null for errors that are not conflicts", () => {
    expect(getConflictedActionStatus(responseError(500))).toBeNull();
    expect(getConflictedActionStatus(new Error("network"))).toBeNull();
  });
});

describe("formatActionTimeLeft", () => {
  it("shows minutes and padded seconds, rounding up", () => {
    expect(formatActionTimeLeft(15 * 60 * 1000)).toBe("15:00 left");
    expect(formatActionTimeLeft(61_500)).toBe("1:02 left");
    expect(formatActionTimeLeft(400)).toBe("0:01 left");
  });
});
