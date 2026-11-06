import { describe, expect, it } from "vitest";

import { AdminOperationsRow } from "@/components/admin/admin-operations-row";
import type { AdminOperationsDto } from "@/types/admin";
import { render, screen } from "@testing-library/react";

const operations: AdminOperationsDto = {
  periodStart: "2026-10-29",
  periodEnd: "2026-11-04",
  bucket: "day",
  throughput: [
    { start: "2026-10-29", jobs: 2, products: 20 },
    { start: "2026-10-30", jobs: 0, products: 0 },
    { start: "2026-10-31", jobs: 5, products: 50 },
  ],
  activeSellers: 30,
  previousActiveSellers: 20,
  funnel: { products: 70, designed: 70, mockedUp: 69, listed: 4, published: 0 },
  aiUsage: [
    { feature: "image_generation", calls: 200, failed: 12, costUsd: 8 },
    { feature: "listing", calls: 50, failed: 0, costUsd: 0.5 },
  ],
};

describe("AdminOperationsRow", () => {
  it("draws one bar per bucket, empty buckets included, and names the busiest", () => {
    render(<AdminOperationsRow operations={operations} isLoading={false} />);

    expect(screen.getByRole("img", { name: "Products created per period" }).children).toHaveLength(
      3
    );
    expect(screen.getByText("Oct 31", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/with 50 products/)).toBeInTheDocument();
    expect(screen.getByText("+50.0%")).toBeInTheDocument();
  });

  it("points at the pipeline step that loses the most products", () => {
    render(<AdminOperationsRow operations={operations} isLoading={false} />);

    expect(screen.getByText("Mock-ups → Listing copy")).toBeInTheDocument();
    expect(screen.getByText(/65 products stop/)).toBeInTheDocument();
  });

  it("prices the AI work and names the feature that fails too often", () => {
    render(<AdminOperationsRow operations={operations} isLoading={false} />);

    expect(screen.getByText("$8.50")).toBeInTheDocument();
    expect(screen.getByText("Design images", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/fails 6\.0% of/)).toBeInTheDocument();
  });

  it("shows a loading block for each card until the period arrives", () => {
    const { container } = render(<AdminOperationsRow isLoading />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });
});
