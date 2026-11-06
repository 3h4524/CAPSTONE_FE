import { describe, expect, it } from "vitest";

import { AdminActivityPanels } from "@/components/admin/admin-activity-panels";
import type { BatchJobDto, SupportTicketDto } from "@/types/admin";
import { render, screen, within } from "@testing-library/react";

const NOW = new Date("2026-11-04T12:00:00Z");

const job = (overrides: Partial<BatchJobDto> = {}): BatchJobDto => ({
  name: "Design run",
  itemCount: 31,
  status: "Completed",
  progressPercentage: "100%",
  userName: "Lan",
  tone: "emerald",
  batchName: "Shop catalog",
  createdAt: "2026-11-04T09:00:00Z",
  aiCostUsd: 0.12,
  ...overrides,
});

const ticket = (id: string, status: string): SupportTicketDto => ({
  id,
  userName: "Minh",
  userEmail: "minh@example.com",
  issue: `Issue ${id}`,
  status,
  priority: "",
});

describe("AdminActivityPanels", () => {
  it("names each job by its batch, with the seller, products, AI cost and age", () => {
    render(<AdminActivityPanels recentBatchJobs={[job()]} totalBatchJobs={7146} now={NOW} />);

    const row = screen.getByRole("row", { name: /Shop catalog/ });
    expect(within(row).getByText("Design run · 3 hours ago")).toBeInTheDocument();
    expect(within(row).getByText("Lan")).toBeInTheDocument();
    expect(within(row).getByText("31")).toBeInTheDocument();
    expect(within(row).getByText("$0.12")).toBeInTheDocument();
    expect(within(row).getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("1 most recent of 7,146")).toBeInTheDocument();
  });

  it("shows how far an unfinished job got, and a dash for a job without AI cost", () => {
    render(
      <AdminActivityPanels
        recentBatchJobs={[
          job({ status: "Running", tone: "amber", progressPercentage: "40%", aiCostUsd: 0 }),
        ]}
        now={NOW}
      />
    );

    const row = screen.getByRole("row", { name: /Shop catalog/ });
    expect(within(row).getByText("40%")).toBeInTheDocument();
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("falls back to the job's name when it has no batch", () => {
    render(
      <AdminActivityPanels
        recentBatchJobs={[job({ batchName: null, createdAt: null })]}
        now={NOW}
      />
    );

    expect(screen.getByRole("row", { name: /Design run/ })).toHaveTextContent("Batch job");
  });

  it("shows empty states and counts tickets still awaiting a reply", () => {
    render(<AdminActivityPanels latestTickets={[ticket("1", "Open"), ticket("2", "Resolved")]} />);

    expect(screen.getByText("No batch jobs yet.")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 awaiting a reply")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reply" })).toHaveAttribute(
      "href",
      "/admin/support-tickets?ticketId=1"
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/admin/support-tickets?ticketId=2"
    );
  });

  it("sends each panel to the page that holds the full list", () => {
    render(<AdminActivityPanels />);

    expect(screen.getByRole("link", { name: /All tickets/ })).toHaveAttribute(
      "href",
      "/admin/support-tickets"
    );
    expect(screen.getByRole("link", { name: /System statistics/ })).toHaveAttribute(
      "href",
      "/admin/analytics"
    );
  });
});
