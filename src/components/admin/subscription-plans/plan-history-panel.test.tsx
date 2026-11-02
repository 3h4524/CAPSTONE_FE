import { describe, expect, it, vi } from "vitest";

import { PlanHistoryPanel } from "@/components/admin/subscription-plans/plan-history-panel";
import type { PlanHistoryEntry } from "@/types/admin-subscription-plan";
import { fireEvent, render, screen } from "@testing-library/react";

const entries: PlanHistoryEntry[] = [
  {
    id: "1",
    at: "2026-10-31T09:30:00Z",
    actorName: "Ada Admin",
    kind: "limit",
    planName: "Starter",
    summary: "Set Listings per month on Starter from 10 to 20.",
  },
  {
    id: "2",
    at: "2026-10-30T15:00:00Z",
    actorName: null,
    kind: "settings",
    planName: null,
    summary: "Changed Free and trial: free mockups 6 → 4.",
  },
];

const usePlanHistory = vi.fn((pageNumber: number, pageSize: number) => ({
  data: { items: entries, totalCount: 45, pageNumber, pageSize, totalPages: 3 },
  isLoading: false,
  isPlaceholderData: false,
}));

vi.mock("@/hooks/queries/use-plan-history", () => ({
  usePlanHistory: (pageNumber: number, pageSize: number) => usePlanHistory(pageNumber, pageSize),
}));

describe("PlanHistoryPanel", () => {
  it("lists each change with who made it, grouped by day", () => {
    render(<PlanHistoryPanel />);

    expect(screen.getByText("Set Listings per month on Starter from 10 to 20.")).toBeInTheDocument();
    expect(screen.getByText(/Plan limit · Starter · Ada Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Free and trial · Unknown admin/)).toBeInTheDocument();
    expect(screen.getByText(/31 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByText(/30 Oct 2026/)).toBeInTheDocument();
  });

  it("pages through the changes, 10 at a time", () => {
    render(<PlanHistoryPanel />);

    expect(usePlanHistory).toHaveBeenLastCalledWith(1, 10);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("1–2 of 45")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Newer/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Older/ }));

    expect(usePlanHistory).toHaveBeenLastCalledWith(2, 10);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Newer/ })).toBeEnabled();
  });
});
