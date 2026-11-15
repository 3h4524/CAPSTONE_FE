import { describe, expect, it } from "vitest";

import { formatActionTimeLeft, getConflictedActionStatus, getPendingActionLink } from "@/helpers/assistant-pending-action";
import type { AssistantPendingAction } from "@/types/assistant";

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

describe("getPendingActionLink", () => {
  const action = (status: AssistantPendingAction["status"], result: unknown): AssistantPendingAction => ({
    id: "a1",
    toolName: "create_workflow",
    title: "Create workflow",
    summary: "",
    status,
    expiresAt: "",
    result,
  });

  it("links to what an executed action created", () => {
    expect(getPendingActionLink(action("executed", { workflowId: "w", openPath: "/workflows?id=w", openLabel: "Open workflow" }))).toEqual({
      path: "/workflows?id=w",
      label: "Open workflow",
    });
  });

  it("has no link before the action ran or without one in its result", () => {
    expect(getPendingActionLink(action("pending", { openPath: "/batches", openLabel: "Open batches" }))).toBeNull();
    expect(getPendingActionLink(action("executed", { runId: "r" }))).toBeNull();
    expect(getPendingActionLink(action("executed", undefined))).toBeNull();
  });
});
