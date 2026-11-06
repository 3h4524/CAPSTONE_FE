import { describe, expect, it, vi } from "vitest";

import { FeatureAdoptionCard } from "@/components/admin/subscription-plans/feature-adoption-card";
import type { FeatureAdoption, PlanGroupInsight } from "@/types/plan-insights";
import { fireEvent, render, screen } from "@testing-library/react";

const feature = (metric: string, label: string, rate: number | null, users = 10, medianUses: number | null = 1): FeatureAdoption => ({
  metric,
  label,
  includedInPlan: rate !== null,
  users,
  rate: rate ?? 0,
  medianUses,
});

const plan = (key: string, name: string, subscribers: number, adoption: FeatureAdoption[]): PlanGroupInsight => ({
  key,
  name,
  isTrial: false,
  subscribers,
  hasEnoughData: true,
  monthlyPriceVnd: 0,
  adoption,
  cost: { platformCostPerSubscriberVnd: 0, revenuePerSubscriberVnd: 0, costShare: null },
});

const plans = [
  plan("starter", "Starter", 113, [
    feature("design_images", "Design images", 72.6, 82, 3),
    feature("lifestyle_mockups", "Lifestyle mockups (AI)", null),
    feature("ai_videos", "AI videos", null),
  ]),
  plan("pro", "Pro", 87, [
    feature("design_images", "Design images", 80.5, 70, 6),
    feature("lifestyle_mockups", "Lifestyle mockups (AI)", 50.6, 44),
    feature("ai_videos", "AI videos", 46, 40),
  ]),
  plan("studio", "Studio", 38, [
    feature("design_images", "Design images", 86.8, 33, 6),
    feature("lifestyle_mockups", "Lifestyle mockups (AI)", 42.1, 16),
    feature("ai_videos", "AI videos", 26.3, 10),
  ]),
];

const renderCard = (onFeatureSelect = vi.fn()) =>
  render(
    <FeatureAdoptionCard
      plans={plans}
      underusedBelow={30}
      days={45}
      reviewedFeatures={new Set(["ai_videos"])}
      onFeatureSelect={onFeatureSelect}
    />
  );

describe("FeatureAdoptionCard", () => {
  it("shows each share to one decimal, and a clear drop from the plan before in words", () => {
    renderCard();

    const cell = screen.getAllByLabelText(/^AI videos, Studio, 26.3%/)[0];
    expect(cell).toHaveTextContent("26.3%");
    expect(cell).toHaveTextContent("▼19.7 vs Pro");
    expect(screen.getAllByLabelText(/^AI videos, Pro, 46.0%/)[0]).toBeInTheDocument();
    // A rise is not marked, and neither is a plan whose plan before lacks the feature.
    expect(screen.getAllByLabelText(/^Design images, Pro/)[0]).not.toHaveTextContent(/[▲▼]/);
    expect(screen.getAllByLabelText(/^AI videos, Pro/)[0]).not.toHaveTextContent("▼");
  });

  it("keeps underused in the label and the bar only, and the typical count in the tooltip", () => {
    renderCard();

    const cell = screen.getAllByLabelText("AI videos, Studio, 26.3%, 10 of 38 Sellers, underused, down 19.7 points from Pro")[0];
    expect(cell).not.toHaveTextContent("×");
    expect(screen.getAllByLabelText(/^Design images, Starter/)[0]).not.toHaveTextContent("×");
  });

  it("says what stands out in each feature's own row", () => {
    renderCard();

    const aiVideos = screen.getByRole("row", { name: /^AI videos/ });
    expect(aiVideos).toHaveTextContent("Underused on Studio");
    expect(screen.getByRole("row", { name: /^Design images/ })).not.toHaveTextContent("Underused");
  });

  it("turns (AI) into a badge", () => {
    renderCard();

    expect(screen.queryByText("Lifestyle mockups (AI)")).not.toBeInTheDocument();
    expect(screen.getAllByText("Lifestyle mockups").length).toBeGreaterThan(0);
  });

  it("opens the AI review of a feature it comments on", () => {
    const onFeatureSelect = vi.fn();
    renderCard(onFeatureSelect);

    fireEvent.click(screen.getAllByRole("button", { name: "AI videos" })[0]);

    expect(onFeatureSelect).toHaveBeenCalledWith("ai_videos");
    expect(screen.queryByRole("button", { name: "Design images" })).not.toBeInTheDocument();
  });
});
