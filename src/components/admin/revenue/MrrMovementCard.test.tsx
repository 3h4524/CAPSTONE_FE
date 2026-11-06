import { describe, expect, it } from "vitest";

import { MrrMovementCard } from "@/components/admin/revenue/MrrMovementCard";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { MrrMovementDto } from "@/types/revenue";
import { fireEvent, render, screen } from "@testing-library/react";

const movement: MrrMovementDto = {
  months: [],
  period: [
    { planName: null, start: 100, new: 20, movedIn: 0, expansion: 0, contraction: 0, movedOut: 0, churn: 10, end: 110 },
    { planName: "Starter", start: 40, new: 10, movedIn: 0, expansion: 0, contraction: 0, movedOut: 0, churn: 10, end: 40 },
    { planName: "Studio", start: 60, new: 10, movedIn: 0, expansion: 0, contraction: 0, movedOut: 0, churn: 0, end: 70 },
  ],
};

const reason = (pattern: string, evidence: string, confidence: "high" | "medium" | "low") => ({
  pattern,
  evidence,
  confidence,
  metrics: [],
  hypothesis: null,
  howToConfirm: null,
});

const aiReview = {
  isConfigured: true,
  isGenerating: false,
  latest: {
    id: "review-1",
    generatedAt: "2026-10-29T05:01:18Z",
    periodStart: "2026-09-15",
    periodEnd: "2026-10-29",
    model: null,
    plans: [
      { key: "starter", name: "Starter", features: [] },
      { key: "studio", name: "Studio", features: [] },
    ],
    review: {
      plans: [
        {
          plan: "starter",
          churnReasons: [
            reason("Leaving is linked to fewer exports.", "42.9% of those who left exported.", "medium"),
            reason("Leaving is linked to not using core features.", "51.4% left without core use.", "high"),
          ],
          churnNote: null,
        },
        { plan: "studio", churnReasons: [], churnNote: "Churn patterns were not analysed: 7 customers stopped paying." },
      ],
      overall: "",
      overallMetrics: [],
    },
  },
  previousScores: [],
  nextRefreshAt: null,
  lastFailedAt: null,
  regenerateAvailableAt: null,
} as unknown as PlanAiReviewResponse;

const renderCard = (review?: PlanAiReviewResponse) =>
  render(<MrrMovementCard data={movement} isLoading={false} startDate="2026-01-01" endDate="2026-10-29" aiReview={review} />);

describe("MrrMovementCard: why customers leave", () => {
  it("for all plans, gives each plan's strongest AI reason, labelled with the review's own days", () => {
    renderCard(aiReview);

    expect(screen.getByText("Why customers leave")).toBeInTheDocument();
    expect(screen.getByText(/AI review of 15 Sep – 29 Oct 2026, whatever period is selected above/)).toBeInTheDocument();
    expect(screen.getByText("Leaving is linked to not using core features.")).toBeInTheDocument();
    expect(screen.queryByText("Leaving is linked to fewer exports.")).not.toBeInTheDocument();
    expect(screen.getByText("Churn patterns were not analysed: 7 customers stopped paying.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See details in Plan Insights/ })).toHaveAttribute(
      "href",
      "/admin/subscription-plans?view=insights"
    );
  });

  it("for one plan, gives its two strongest reasons, the most certain first, and links to that plan", () => {
    renderCard(aiReview);

    fireEvent.click(screen.getByRole("tab", { name: "Starter" }));

    expect(screen.getAllByText(/^Leaving is linked to/).map((item) => item.textContent)).toEqual([
      "Leaving is linked to not using core features.",
      "Leaving is linked to fewer exports.",
    ]);
    expect(screen.getByRole("link", { name: /See details in Plan Insights/ })).toHaveAttribute(
      "href",
      "/admin/subscription-plans?view=insights&plan=starter"
    );
  });

  it("shows nothing before the first review", () => {
    renderCard();

    expect(screen.queryByText("Why customers leave")).not.toBeInTheDocument();
  });
});
