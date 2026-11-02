import { describe, expect, it, vi } from "vitest";

import { picksFromPlan, toFeatureInputs } from "@/components/admin/subscription-plans/plan-feature-picker";
import { PlanFormDialog } from "@/components/admin/subscription-plans/plan-form-dialog";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const create = vi.fn();
const update = vi.fn();

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
  feature("design_images", "Design images from prompt", { group: "Design images" }),
  feature("design_variations", "Design variations per product", { group: "Design images", kind: "limit", defaultLimit: 2 }),
  feature("standard_video", "Standard video"),
  feature("ai_video", "AI video (Veo)"),
  feature("workflow_publish", "Publish to Etsy and Printify", { isActive: false }),
];

vi.mock("@/hooks/queries/use-admin-features", () => ({ useAdminFeatures: () => ({ data: catalog }) }));
vi.mock("@/hooks/mutations/use-create-subscription-plan", () => ({
  useCreateSubscriptionPlan: () => ({ mutate: create, isPending: false }),
}));
vi.mock("@/hooks/mutations/use-update-subscription-plan", () => ({
  useUpdateSubscriptionPlan: () => ({ mutate: update, isPending: false }),
}));

const pro = {
  id: "pro-id",
  name: "Pro",
  tier: "pro",
  description: null,
  monthlyPriceUsd: 29.99,
  annualPriceUsd: null,
  maxBatchSize: 200,
  maxConcurrentJobs: 5,
  maxProductsPerMonth: 0,
  imageGenerationQuota: 0,
  videoGenerationQuota: 0,
  apiCallQuota: 0,
  storageQuotaGb: 0,
  customApiKeysAllowed: false,
  whiteLabelExportEnabled: false,
  prioritySupport: false,
  isActive: true,
  features: [
    { code: "design_images", isEnabled: true, limitValue: null },
    { code: "design_variations", isEnabled: true, limitValue: 4 },
    { code: "ai_video", isEnabled: true, limitValue: null },
  ],
} as unknown as AdminSubscriptionPlan;

const fillBasics = () => {
  fireEvent.change(screen.getByLabelText("Plan name"), { target: { value: "Creator" } });
  fireEvent.change(screen.getByLabelText("Tier slug"), { target: { value: "creator" } });
  fireEvent.change(screen.getByLabelText("Monthly price (USD)"), { target: { value: "19.99" } });
};

describe("PlanFormDialog", () => {
  it("starts a new plan off sale, with only the basics and no dead switches", () => {
    render(<PlanFormDialog open plan={null} usdToVndRate={25000} plans={[pro]} onClose={vi.fn()} />);

    expect(screen.getByText("Included · 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Design images from prompt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Standard video" })).toBeInTheDocument();
    expect(screen.queryByText("AI video (Veo)")).not.toBeInTheDocument();
    expect(screen.queryByText("Publish to Etsy and Printify")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Design variations per product")).toHaveValue(2);
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.queryByText("Custom API keys")).not.toBeInTheDocument();
    expect(screen.queryByText("White-label export")).not.toBeInTheDocument();
    expect(screen.queryByText("Priority support")).not.toBeInTheDocument();
  });

  it("creates the plan with the picked features", async () => {
    render(<PlanFormDialog open plan={null} usdToVndRate={25000} plans={[pro]} onClose={vi.fn()} />);
    fillBasics();
    fireEvent.click(screen.getByRole("button", { name: "Add feature" }));
    const chooser = screen.getByRole("dialog", { name: "Add features to the new plan" });
    expect(within(chooser).queryByText("Publish to Etsy and Printify")).not.toBeInTheDocument();
    fireEvent.click(within(chooser).getByRole("checkbox", { name: "AI video (Veo)" }));
    fireEvent.click(within(chooser).getByRole("button", { name: "Add feature" }));
    expect(screen.getByRole("button", { name: "Remove AI video (Veo)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      name: "Creator",
      tier: "creator",
      isActive: false,
      features: [
        { code: "design_images", isEnabled: true, limitValue: null },
        { code: "design_variations", isEnabled: true, limitValue: 2 },
        { code: "standard_video", isEnabled: true, limitValue: null },
        { code: "ai_video", isEnabled: true, limitValue: null },
      ],
    });
  });

  it("copies another plan's features, limits included", () => {
    const picks = picksFromPlan(catalog, pro);

    expect(toFeatureInputs(catalog, picks)).toEqual([
      { code: "design_images", isEnabled: true, limitValue: null },
      { code: "design_variations", isEnabled: true, limitValue: 4 },
      { code: "ai_video", isEnabled: true, limitValue: null },
    ]);
  });

  it("edits a plan without touching its features", async () => {
    render(<PlanFormDialog open plan={pro} usdToVndRate={25000} plans={[pro]} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Add feature" })).not.toBeInTheDocument();
    expect(screen.getByText(/a period already paid keeps its price/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].input.features).toBeUndefined();
  });
});
