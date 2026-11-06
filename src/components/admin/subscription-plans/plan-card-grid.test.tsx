import { describe, expect, it, vi } from "vitest";

import { PlanCardGrid } from "@/components/admin/subscription-plans/plan-card-grid";
import type { AdminSubscriptionPlan, PlanFeatureImpact } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mutate = vi.fn();

const impact: PlanFeatureImpact = {
  code: "lifestyle_mockup",
  label: "Lifestyle mockups (AI)",
  current: { isEnabled: true, limitValue: null },
  proposed: { isEnabled: false, limitValue: null },
  subscribers: 97,
  trials: 45,
  isReduction: true,
  keptBy: 120,
  keptUntil: "2027-10-26",
  usedRecently: 44,
  usageDays: 30,
  paidForBy: 80,
  paidForUntil: "2027-10-26",
  noticeBy: 40,
  noticeUntil: "2026-11-30",
  givenRecently: false,
  noticeDays: 30,
};

const feature = (code: string, label: string, overrides: Partial<AdminFeature> = {}): AdminFeature => ({
  code,
  label,
  description: "",
  group: "Video",
  kind: "flag",
  unit: null,
  sortOrder: 0,
  defaultLimit: null,
  trialAvailable: true,
  isActive: true,
  plans: [],
  updatedAt: null,
  updatedByName: null,
  ...overrides,
});

const catalog: AdminFeature[] = [
  feature("design_variations", "Design variations per product", { kind: "limit", group: "Design images", sortOrder: 10 }),
  feature("lifestyle_mockup", "Lifestyle mockups (AI)", { sortOrder: 40, plans: ["Pro"] }),
  feature("ai_video", "AI video (Veo)", { sortOrder: 70, plans: ["Pro"] }),
  feature("workflow_publish", "Publish to Etsy and Printify", { sortOrder: 130, isActive: false }),
  feature("daily_mockup_cap", "Daily mockup safety cap", { kind: "limit", unit: "per day", sortOrder: 90 }),
];

vi.mock("@/hooks/queries/use-admin-features", () => ({ useAdminFeatures: () => ({ data: catalog }) }));
// Has its own test.
vi.mock("@/components/admin/subscription-plans/free-trial-card", () => ({ FreeTrialCard: () => null }));
const duplicate = vi.fn();
const reorder = vi.fn();
vi.mock("@/hooks/mutations/use-plan-tools", () => ({
  useDuplicatePlan: () => ({ mutate: duplicate, isPending: false }),
  useReorderPlans: () => ({ mutate: reorder, isPending: false }),
}));
vi.mock("@/hooks/queries/use-plan-feature-impact", () => ({
  usePlanFeatureImpact: (target: unknown) => ({ data: target ? impact : undefined, isLoading: false }),
}));
vi.mock("@/hooks/mutations/use-change-plan-features", () => ({
  useChangePlanFeatures: () => ({ mutate, isPending: false }),
}));
const setRecommended = vi.fn();
vi.mock("@/hooks/queries/use-plan-settings", () => ({ usePlanSettings: () => ({ data: { recommendedPlanTier: "pro" } }) }));
vi.mock("@/hooks/mutations/use-set-recommended-plan", () => ({
  useSetRecommendedPlan: () => ({ mutate: setRecommended, isPending: false }),
}));

const plan = {
  id: "starter-id",
  name: "Starter",
  tier: "starter",
  description: null,
  monthlyPriceUsd: 9.99,
  annualPriceUsd: null,
  monthlyPriceVnd: 249750,
  annualPriceVnd: null,
  usdToVndRate: 25000,
  maxBatchSize: 20,
  maxConcurrentJobs: 1,
  activeSubscriberCount: 123,
  trialSubscriberCount: 0,
  isActive: true,
  canDelete: false,
  features: [
    { code: "design_variations", isEnabled: true, limitValue: 2 },
    { code: "lifestyle_mockup", isEnabled: true, limitValue: null },
    { code: "ai_video", isEnabled: false, limitValue: null },
    { code: "daily_mockup_cap", isEnabled: true, limitValue: 300 },
  ],
} as unknown as AdminSubscriptionPlan;

const renderGrid = () => render(<PlanCardGrid plans={[plan]} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

describe("PlanCardGrid features", () => {
  it("lists only what the plan has, and its limits", () => {
    renderGrid();

    expect(screen.getByText("Features").closest("p")).toHaveTextContent(/^Features1$/);
    expect(screen.getByText("Lifestyle mockups (AI)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove AI video (Veo) from Starter" })).not.toBeInTheDocument();
    expect(screen.queryByText("300 per day")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Limits · / }));
    expect(screen.getByText("300 per day")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("offers only active features the plan lacks when adding", () => {
    mutate.mockClear();
    renderGrid();

    fireEvent.click(screen.getByRole("button", { name: /Add several/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("AI video (Veo)")).toBeInTheDocument();
    expect(within(dialog).queryByText("Publish to Etsy and Printify")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Lifestyle mockups (AI)")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "AI video (Veo)" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add feature" }));
    expect(mutate).toHaveBeenCalledWith({ type: "add", planId: "starter-id", features: [{ code: "ai_video" }] });
  });

  it("lists what the plan lacks and adds one in a click", () => {
    mutate.mockClear();
    renderGrid();

    fireEvent.click(screen.getByRole("button", { name: "Not in Starter · 1" }));
    expect(screen.queryByRole("button", { name: "Add Publish to Etsy and Printify to Starter" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add AI video (Veo) to Starter" }));

    expect(mutate).toHaveBeenCalledWith({ type: "add", planId: "starter-id", features: [{ code: "ai_video" }] });
  });

  it("shows who keeps a feature before removing it", () => {
    mutate.mockClear();
    renderGrid();

    fireEvent.click(screen.getByRole("button", { name: "Remove Lifestyle mockups (AI) from Starter" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/80 subscribers paid for it and keep it until their period ends \(latest\s+26 Oct 2027\)/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/40 subscribers got it after their period began and keep it for\s+30 days \(until 30 Nov 2026 at the latest\)/)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/44 of them used it in the last 30 days/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove from Starter" }));
    expect(mutate).toHaveBeenCalledWith({ type: "remove", planId: "starter-id", code: "lifestyle_mockup" });
  });

  it("saves a new limit, or no limit", () => {
    mutate.mockClear();
    renderGrid();

    // "Show all details" opens every card's sections at once.
    fireEvent.click(screen.getByRole("button", { name: "Show all details" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Daily mockup safety cap on Starter" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "No limit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save limit" }));

    expect(mutate).toHaveBeenCalledWith({ type: "limit", planId: "starter-id", code: "daily_mockup_cap", limitValue: null });
  });
});

describe("PlanCardGrid tools", () => {
  const pro = { ...plan, id: "pro-id", name: "Pro", tier: "pro" } as AdminSubscriptionPlan;
  const renderTwo = () => render(<PlanCardGrid plans={[plan, pro]} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

  it("lists on a pricier plan only what the cheaper one lacks, and all on request", () => {
    const pricier = {
      ...plan,
      id: "pro-id",
      name: "Pro",
      tier: "pro",
      monthlyPriceUsd: (plan.monthlyPriceUsd ?? 0) + 20,
      features: [...plan.features.filter((row) => row.code !== "ai_video"), { code: "ai_video", isEnabled: true, limitValue: null }],
    } as AdminSubscriptionPlan;
    render(<PlanCardGrid plans={[plan, pricier]} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Everything in Starter, plus:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove AI video (Veo) from Pro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Lifestyle mockups (AI) from Pro" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Show all [0-9]/ }));
    expect(screen.getByRole("button", { name: "Remove Lifestyle mockups (AI) from Pro" })).toBeInTheDocument();
  });

  it("marks the plan Sellers see as Recommended, and changes it", () => {
    renderTwo();

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop recommending Pro" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Recommend Starter" }));
    expect(setRecommended).toHaveBeenCalledWith("starter");

    fireEvent.click(screen.getByRole("button", { name: "Stop recommending Pro" }));
    expect(setRecommended).toHaveBeenLastCalledWith(null);
  });

  it("duplicates a plan under a new name and tier", () => {
    renderTwo();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Pro" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("New plan name")).toHaveValue("Pro copy");
    fireEvent.change(within(dialog).getByLabelText("Tier slug"), { target: { value: "Pro Plus" } });
    expect(within(dialog).getByRole("button", { name: "Create copy" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Tier slug"), { target: { value: "pro-plus" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create copy" }));

    expect(duplicate).toHaveBeenCalledWith({ planId: "pro-id", name: "Pro copy", tier: "pro-plus" });
  });

  it("slides more than four plans sideways instead of wrapping", () => {
    const five = ["a", "b", "c", "d", "e"].map((id) => ({ ...plan, id, name: `Plan ${id}`, tier: id }) as AdminSubscriptionPlan);
    render(<PlanCardGrid plans={five} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Previous plans" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next plans" })).toBeEnabled();
    expect(screen.getByText(/Plans 1–\d of 5/)).toBeInTheDocument();
  });

  it("shows no arrows for four plans or fewer", () => {
    renderTwo();

    expect(screen.queryByRole("button", { name: "Next plans" })).not.toBeInTheDocument();
  });

  it("moves a plan with the arrow keys and saves the order", () => {
    renderTwo();

    fireEvent.keyDown(screen.getByRole("button", { name: /Move Pro/ }), { key: "ArrowLeft" });

    expect(reorder).toHaveBeenCalledWith(["pro-id", "starter-id"]);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Pro", "Starter"]);
  });
});

describe("PlanCardGrid compare", () => {
  const openCompare = () => {
    renderGrid();
    fireEvent.click(screen.getByRole("tab", { name: "Compare" }));
  };

  it("shows one switch per plan and feature, and the limits", () => {
    openCompare();

    expect(screen.getByRole("switch", { name: "Lifestyle mockups (AI) on Starter" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "AI video (Veo) on Starter" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("switch", { name: "Publish to Etsy and Printify on Starter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Daily mockup safety cap on Starter" })).toHaveTextContent("300 per day");
  });

  it("adds at once and asks before removing", () => {
    mutate.mockClear();
    openCompare();

    fireEvent.click(screen.getByRole("switch", { name: "AI video (Veo) on Starter" }));
    expect(mutate).toHaveBeenCalledWith({ type: "add", planId: "starter-id", features: [{ code: "ai_video" }] });

    fireEvent.click(screen.getByRole("switch", { name: "Lifestyle mockups (AI) on Starter" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Remove Lifestyle mockups (AI) from Starter?");
  });
});
