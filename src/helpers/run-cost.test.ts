import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmRunCost, takeRunAiBudget } from "@/helpers/run-cost";
import type { CostConfirmRequest } from "@/stores/cost-confirm";
import type { RunCostEstimate } from "@/types/video-workflow";

const { estimateMock, askMock } = vi.hoisted(() => ({ estimateMock: vi.fn(), askMock: vi.fn() }));
vi.mock("@/api/run-groups", () => ({ estimateWorkflowRun: estimateMock }));
vi.mock("@/stores/cost-confirm", () => ({ askCostConfirm: askMock }));

const estimate = (overrides: Partial<RunCostEstimate> = {}): RunCostEstimate => ({
  items: [
    { kind: "design_images", label: "Design images", detail: "2 products × 2 variants", quantity: 4, estimatedCostUsd: 0.27 },
    { kind: "ai_video", label: "Tee A", detail: "2 videos × 2 AI clips (12 s)", quantity: 4, estimatedCostUsd: 1.92 },
    { kind: "model_photos", label: "Model photos", detail: "One per design", quantity: 2, estimatedCostUsd: 0 },
  ],
  totalUsd: 2.19,
  aiVideoBudgetUsd: 1.92,
  note: "Estimate only.",
  ...overrides,
});

describe("confirmRunCost", () => {
  beforeEach(() => {
    sessionStorage.clear();
    askMock.mockReset().mockResolvedValue(true);
    estimateMock.mockReset().mockResolvedValue(estimate());
  });

  it("shows every item of the estimate with its cost and keeps the confirmed AI budget for the videos", async () => {
    await expect(confirmRunCost("wf")).resolves.toBe(true);

    const request = askMock.mock.calls[0]![0] as CostConfirmRequest;
    expect(request.lines.map((line) => [line.label, line.amountUsd])).toEqual([
      ["Design images", 0.27],
      ["Tee A", 1.92],
      ["Model photos", 0],
    ]);
    expect(request.totalUsd).toBe(2.19);
    expect(takeRunAiBudget("wf")).toBe(1.92);
    // Taken once: a later group of another Run does not inherit it.
    expect(takeRunAiBudget("wf")).toBeUndefined();
  });

  it("starts nothing and keeps no budget when the seller cancels", async () => {
    askMock.mockResolvedValue(false);

    await expect(confirmRunCost("wf")).resolves.toBe(false);
    expect(takeRunAiBudget("wf")).toBeUndefined();
  });

  it("asks nothing for a run that bills nothing", async () => {
    estimateMock.mockResolvedValue(estimate({ items: [], totalUsd: 0, aiVideoBudgetUsd: 0 }));

    await expect(confirmRunCost("wf")).resolves.toBe(true);
    expect(askMock).not.toHaveBeenCalled();
  });

  it("goes ahead without a budget when the estimate cannot be read", async () => {
    estimateMock.mockRejectedValue(new Error("offline"));

    await expect(confirmRunCost("wf")).resolves.toBe(true);
    expect(askMock).not.toHaveBeenCalled();
    expect(takeRunAiBudget("wf")).toBeUndefined();
  });
});
