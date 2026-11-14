import { describe, expect, it } from "vitest";

import { CategoryBreakdown, DeciderBreakdown } from "@/components/admin/content-safety/overview/breakdowns";
import { DecisionsChart } from "@/components/admin/content-safety/overview/decisions-chart";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("content safety overview parts", () => {
  it("labels each category bar with its blocked and flagged counts", () => {
    render(
      <CategoryBreakdown
        items={[
          { category: "sexual", blocked: 4, flagged: 2 },
          { category: "hate", blocked: 1, flagged: 0 },
        ]}
      />
    );

    expect(screen.getByText("Sexual")).toBeInTheDocument();
    expect(screen.getByText("4 blocked · 2 flagged")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hate: 1 blocked, 0 flagged" })).toBeInTheDocument();
  });

  it("names the blocking layers and their share", () => {
    render(
      <DeciderBreakdown
        items={[
          { key: "gemini", count: 3 },
          { key: "blocklist", count: 1 },
        ]}
      />
    );

    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("3 · 75%")).toBeInTheDocument();
    expect(screen.getByText("Blocklist")).toBeInTheDocument();
  });

  it("says when nothing was blocked", () => {
    render(<CategoryBreakdown items={[]} />);

    expect(screen.getByText("Nothing blocked or flagged in this period.")).toBeInTheDocument();
  });

  it("shows the same numbers as a table on request", async () => {
    render(
      <DecisionsChart
        daily={[
          { date: "2026-11-13", allowed: 10, flagged: 2, blocked: 1, unchecked: 0 },
          { date: "2026-11-14", allowed: 5, flagged: 0, blocked: 3, unchecked: 1 },
        ]}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Show as table" }));

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    // Newest day first, columns from Blocked to Allowed.
    expect(within(rows[1]!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["14 Nov", "3", "0", "1", "5"]);
  });
});
