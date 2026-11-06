import { describe, expect, it } from "vitest";

import { AdminAttentionPanel, healthChecks } from "@/components/admin/admin-attention-panel";
import type { FinancialAlertDto } from "@/types/revenue";
import type { IntegrationStatusDto } from "@/types/system-statistics";
import { render, screen, within } from "@testing-library/react";

const NOW = new Date("2026-11-04T12:00:00Z");

const alert = (
  id: string,
  type: FinancialAlertDto["type"],
  amount?: number
): FinancialAlertDto => ({
  id,
  type,
  title: `Alert ${id}`,
  description: "",
  scope: "Now",
  count: 3,
  amount,
  amountLabel: amount ? "per month at risk" : null,
});

const integrations = (total: number, failed: number): IntegrationStatusDto => ({
  etsySuccessRate: 0,
  etsyTotal: total,
  etsyGrowthPercentage: 0,
  printifySuccessRate: 0,
  printifyTotal: 0,
  printifyGrowthPercentage: 0,
  socialMediaSuccessRate: 0,
  socialMediaTotal: 0,
  socialMediaGrowthPercentage: 0,
  failedIntegrationsCount: failed,
});

const statusOf = (checks: ReturnType<typeof healthChecks>, key: string) =>
  checks.find((check) => check.key === key)?.status;

describe("healthChecks", () => {
  it("passes every area when nothing is wrong", () => {
    const checks = healthChecks({
      pendingTickets: 0,
      integrationStatus: integrations(10, 0),
      now: NOW,
    });

    expect(checks.every((check) => check.status === "ok")).toBe(true);
    expect(checks.map((check) => check.key)).toEqual([
      "revenue",
      "support",
      "ai",
      "uploads",
      "pipeline",
    ]);
  });

  it("rates revenue by its worst alert, lists each risk with its money, and drops informational alerts", () => {
    const checks = healthChecks({
      financialAlerts: [
        alert("w", "warning", 1_000),
        alert("i", "info"),
        alert("d", "danger", 2_000),
      ],
      pendingTickets: 0,
      now: NOW,
    });
    const revenue = checks[0];

    expect(revenue.key).toBe("revenue");
    expect(revenue.status).toBe("critical");
    expect(revenue.summary).toMatch(/^2 risks · /);
    expect(revenue.details.map((detail) => detail.text)).toEqual(["Alert d (3)", "Alert w (3)"]);
    expect(revenue.details[0].figure).toMatch(/per month at risk$/);
  });

  it("flags AI failures from 2% and calls 5% critical, naming the least reliable feature", () => {
    const warning = healthChecks({
      aiUsage: [{ feature: "listing", calls: 100, failed: 3, costUsd: 1 }],
      pendingTickets: 0,
      now: NOW,
    });
    expect(statusOf(warning, "ai")).toBe("warning");

    const critical = healthChecks({
      aiUsage: [
        { feature: "image_generation", calls: 100, failed: 8, costUsd: 4 },
        { feature: "listing", calls: 100, failed: 1, costUsd: 1 },
      ],
      pendingTickets: 0,
      now: NOW,
    });
    const ai = critical.find((check) => check.key === "ai")!;
    expect(ai.status).toBe("critical");
    expect(ai.summary).toBe("4.5% of 200 calls failed");
    expect(ai.details[0]).toMatchObject({
      text: "Design images fails most",
      figure: "8.0% · 8 calls",
    });
  });

  it("calls failed uploads critical from a fifth of all uploads", () => {
    expect(
      statusOf(
        healthChecks({ integrationStatus: integrations(100, 5), pendingTickets: 0 }),
        "uploads"
      )
    ).toBe("warning");
    expect(
      statusOf(
        healthChecks({ integrationStatus: integrations(100, 20), pendingTickets: 0 }),
        "uploads"
      )
    ).toBe("critical");
  });

  it("only counts pipeline errors from the last 24 hours", () => {
    const checks = healthChecks({
      recentErrors: [
        { id: "new", timestamp: "2026-11-04T08:00:00Z", errorType: "Timeout", message: "Gemini" },
        { id: "old", timestamp: "2026-11-02T08:00:00Z", errorType: "Timeout", message: "Gemini" },
      ],
      pendingTickets: 0,
      now: NOW,
    });
    const pipeline = checks.find((check) => check.key === "pipeline")!;

    expect(pipeline.status).toBe("warning");
    expect(pipeline.summary).toBe("1 error in the last 24 hours");
  });
});

describe("AdminAttentionPanel", () => {
  it("lists the areas needing attention first, each with an action, and the passing ones without", () => {
    render(<AdminAttentionPanel pendingTickets={2} now={NOW} />);

    expect(screen.getByText("1 of 5 need attention")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Support queue");
    const reply = within(items[0]).getByRole("link", { name: /Reply/ });
    expect(reply).toHaveAttribute("href", "/admin/support-tickets");
    expect(within(items[0]).getByText("2 tickets awaiting a reply")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("No revenue at risk")).toBeInTheDocument();
  });
});
