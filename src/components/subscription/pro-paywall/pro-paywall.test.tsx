import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProLocked } from "@/components/subscription/pro-paywall/pro-locked";
import { ProPaywallDialog } from "@/components/subscription/pro-paywall/pro-paywall-dialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  overview: undefined as unknown,
  startTrial: vi.fn(),
  checkoutPlan: null as { name: string } | null,
  upgradePlan: null as { name: string } | null,
}));

vi.mock("@/hooks/queries/use-subscription-overview", () => ({
  SUBSCRIPTION_OVERVIEW_QUERY_KEY: ["subscription-overview"],
  useSubscriptionOverview: () => ({ data: mocks.overview }),
}));
vi.mock("@/hooks/mutations/use-start-trial", () => ({ useStartTrial: () => ({ mutate: mocks.startTrial, isPending: false }) }));
// The payment modals are the Subscription page's own; here they only say which plan they were opened for.
vi.mock("@/components/subscription/checkout-modal/subscription-checkout-modal", () => ({
  SubscriptionCheckoutModal: ({ plan }: { plan: { name: string } | null }) => (plan ? <p>checkout {plan.name}</p> : null),
}));
vi.mock("@/components/subscription/upgrade-modal/subscription-upgrade-modal", () => ({
  SubscriptionUpgradeModal: ({ plan }: { plan: { name: string } | null }) => (plan ? <p>upgrade {plan.name}</p> : null),
}));

const pro = { planId: "pro", name: "Pro", tier: "pro", monthlyPriceUsd: 29.99, isCurrentPlan: false };
const topic = { title: "Competitors are part of Pro", description: "See the shops leading this niche." };

const renderDialog = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <ProPaywallDialog topic={topic} benefits={["Every opportunity on your radar"]} onClose={vi.fn()} />
  </QueryClientProvider>,
);

describe("ProPaywallDialog", () => {
  beforeEach(() => {
    mocks.startTrial.mockReset();
  });

  it("names what was locked, what Pro adds and its price", () => {
    mocks.overview = { availablePlans: [pro], hasActivePaidPlan: false, trialEligible: false, trialDays: 14 };
    renderDialog();

    expect(screen.getByRole("heading", { name: topic.title })).toBeInTheDocument();
    expect(screen.getByText("Every opportunity on your radar")).toBeInTheDocument();
    expect(screen.getByText(/29.99/)).toBeInTheDocument();
  });

  it("offers the free trial first to a Seller who never had one", async () => {
    mocks.overview = { availablePlans: [pro], hasActivePaidPlan: false, trialEligible: true, trialDays: 14, trialPlanName: "Pro" };
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /Try Pro free for 14 days/ }));

    expect(mocks.startTrial).toHaveBeenCalledOnce();
  });

  it("opens the checkout for a Seller on Free", async () => {
    mocks.overview = { availablePlans: [pro], hasActivePaidPlan: false, trialEligible: false, trialDays: 14 };
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Get Pro" }));

    expect(screen.getByText("checkout Pro")).toBeInTheDocument();
  });

  it("opens the upgrade for a Seller on another paid plan", async () => {
    mocks.overview = { availablePlans: [pro], hasActivePaidPlan: true, trialEligible: false, trialDays: 14 };
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(screen.getByText("upgrade Pro")).toBeInTheDocument();
  });
});

describe("ProLocked", () => {
  it("hides its stand-in from assistive tech and opens the offer from the lock", async () => {
    const onUnlock = vi.fn();
    render(<ProLocked label="Competitors are part of Pro" onUnlock={onUnlock}><p>stand-in rows</p></ProLocked>);

    expect(screen.getByText("stand-in rows").closest("[aria-hidden='true']")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Competitors are part of Pro/ }));

    expect(onUnlock).toHaveBeenCalledOnce();
  });
});
