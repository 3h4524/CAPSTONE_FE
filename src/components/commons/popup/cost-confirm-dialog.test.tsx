import { act } from "react";
import { describe, expect, it } from "vitest";

import { CostConfirmDialog } from "@/components/commons/popup/cost-confirm-dialog";
import { askCostConfirm } from "@/stores/cost-confirm";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const request = {
  title: "Confirm the cost of this run",
  lines: [
    { label: "Design images", detail: "2 products × 2 variants", amountUsd: 0.27 },
    { label: "Model photos", detail: "One per design", amountUsd: 0 },
  ],
  totalUsd: 0.27,
  note: "Estimate only.",
  confirmLabel: "Run",
};

describe("CostConfirmDialog", () => {
  it("lists each line with its cost, a free line as Free, and the total", async () => {
    render(<CostConfirmDialog />);
    let answer: Promise<boolean>;
    act(() => {
      answer = askCostConfirm(request);
    });

    expect(await screen.findByText("Design images")).toBeInTheDocument();
    expect(screen.getByText("2 products × 2 variants")).toBeInTheDocument();
    expect(screen.getAllByText("US$0.27")).toHaveLength(2);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Estimate only.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    await expect(answer!).resolves.toBe(true);
  });

  it("counts Cancel as a no", async () => {
    render(<CostConfirmDialog />);
    let answer: Promise<boolean>;
    act(() => {
      answer = askCostConfirm(request);
    });

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await expect(answer!).resolves.toBe(false);
  });
});
