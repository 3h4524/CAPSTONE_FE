import { describe, expect, it, vi } from "vitest";

import { FreeTrialCard } from "@/components/admin/subscription-plans/free-trial-card";
import type { PlanSettings } from "@/types/plan-settings";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mutate = vi.fn();

const settings: PlanSettings = {
  trialPlanTier: "pro",
  trialPlans: [
    { tier: "starter", name: "Starter", maxBatchSize: 20 },
    { tier: "pro", name: "Pro", maxBatchSize: 200 },
  ],
  trialDays: 14,
  allowances: [
    { scope: "free", code: "mockups", label: "Mockups", limit: 6, default: 6 },
    { scope: "free", code: "listings", label: "Listings", limit: 8, default: 5 },
    { scope: "trial", code: "products_per_run", label: "Products per run", limit: 3, default: 3 },
    { scope: "trial", code: "products", label: "Products", limit: 10, default: 10 },
  ],
  activeTrials: 44,
  updatedAt: "2026-10-30T08:00:00Z",
  updatedByName: "Ada Admin",
};

vi.mock("@/hooks/queries/use-plan-settings", () => ({ usePlanSettings: () => ({ data: settings, isLoading: false }) }));
vi.mock("@/hooks/mutations/use-update-plan-settings", () => ({
  useUpdatePlanSettings: () => ({ mutate, isPending: false }),
}));

describe("FreeTrialCard", () => {
  it("shows Free's and the trial's allowances and the plan the trial gives", () => {
    render(<FreeTrialCard />);

    expect(screen.getByText("Free trial · Pro")).toBeInTheDocument();
    expect(screen.getByText(/14 days, counted over the whole trial · 44 running now/)).toBeInTheDocument();
    expect(screen.getByText("(default 5)")).toBeInTheDocument();
    expect(screen.getByText(/Last changed .* by Ada Admin/)).toBeInTheDocument();
  });

  it("warns before lowering and saves every allowance", () => {
    render(<FreeTrialCard />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Mockups"), { target: { value: "4" } });
    expect(within(dialog).getByText(/Lowering Free mockups applies at\s+once/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith({
      trialPlanTier: "pro",
      trialDays: 14,
      allowances: [
        { scope: "free", code: "mockups", limit: 4 },
        { scope: "free", code: "listings", limit: 8 },
        { scope: "trial", code: "products_per_run", limit: 3 },
        { scope: "trial", code: "products", limit: 10 },
      ],
    });
  });

  it("changes how long new trials last, within 1 to 90 days", () => {
    mutate.mockClear();
    render(<FreeTrialCard />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Trial length (days)"), { target: { value: "120" } });
    expect(within(dialog).getByText("A free trial lasts between 1 and 90 days.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Trial length (days)"), { target: { value: "30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ trialPlanTier: "pro", trialDays: 30 }));
  });

  it("refuses more products per run than the trial's products, and resets to defaults", () => {
    mutate.mockClear();
    render(<FreeTrialCard />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Products per run"), { target: { value: "12" } });
    expect(within(dialog).getByText("Trial products per run cannot be more than the trial's products.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /Reset to defaults/ }));
    expect(within(dialog).getByLabelText("Listings")).toHaveValue(5);
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
