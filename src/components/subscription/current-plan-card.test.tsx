import { describe, expect, it, vi } from "vitest";

import { CurrentPlanCard } from "@/components/subscription/current-plan-card";
import { buildSubscriptionOverview } from "@/test/factories";
import type { CurrentSubscription } from "@/types/subscription";
import { fireEvent, render, screen } from "@testing-library/react";

const subscription = (overrides: Partial<CurrentSubscription> = {}): CurrentSubscription => ({
  ...buildSubscriptionOverview().currentSubscription!,
  ...overrides,
});

const renderCard = (current: CurrentSubscription | null, onRenewClick = vi.fn()) => {
  render(
    <CurrentPlanCard
      subscription={current}
      onCancelScheduledDowngrade={vi.fn()}
      isCancellingScheduledDowngrade={false}
      onRenewClick={onRenewClick}
    />
  );
  return onRenewClick;
};

describe("CurrentPlanCard", () => {
  it("warns a past-due Seller with the last day of the grace period and offers Renew now", () => {
    const onRenewClick = renderCard(
      subscription({
        status: "past_due",
        canRenew: true,
        renewalDate: "2026-10-26",
        lastGraceDay: "2026-10-28",
      })
    );

    expect(screen.getByText("Payment due")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Renew by Oct 28, 2026");
    fireEvent.click(screen.getByRole("button", { name: "Renew now" }));
    expect(onRenewClick).toHaveBeenCalledOnce();
  });

  it("offers an early renewal in the last week without the overdue warning", () => {
    renderCard(subscription({ canRenew: true }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew now" })).toBeInTheDocument();
  });

  it("hides Renew now early in the cycle", () => {
    renderCard(subscription({ canRenew: false }));

    expect(screen.queryByRole("button", { name: "Renew now" })).not.toBeInTheDocument();
  });

  it("shows the price in VND as PayOS charges it, not the stored USD price", () => {
    renderCard(subscription({ price: 9.99, priceVnd: 249_750 }));

    // The matcher folds vi-VN's non-breaking space before ₫ into a plain space.
    expect(screen.getByText("249.750 ₫")).toBeInTheDocument();
  });

  it("shows Free without a plan", () => {
    renderCard(null);

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Renew now" })).not.toBeInTheDocument();
  });
});
