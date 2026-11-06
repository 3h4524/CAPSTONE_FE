import { describe, expect, it, vi } from "vitest";

import { FeatureCatalogPanel } from "@/components/admin/subscription-plans/feature-catalog-panel";
import type { AdminFeature } from "@/types/feature-catalog";
import { fireEvent, render, screen, within } from "@testing-library/react";

const mutate = vi.fn();

const feature = (overrides: Partial<AdminFeature>): AdminFeature => ({
  code: "ai_video",
  label: "AI video (Veo)",
  description: "Build videos from AI scenes.",
  group: "Video",
  kind: "flag",
  unit: null,
  sortOrder: 70,
  defaultLimit: null,
  trialAvailable: false,
  isActive: true,
  plans: ["Pro"],
  updatedAt: null,
  updatedByName: null,
  ...overrides,
});

const features: AdminFeature[] = [
  feature({}),
  feature({ code: "all_video_formats", label: "Landscape video", trialAvailable: true, isActive: false, plans: [] }),
  feature({
    code: "daily_mockup_cap",
    label: "Daily mockup safety cap",
    group: "Safety caps",
    kind: "limit",
    unit: "per day",
    defaultLimit: 300,
    trialAvailable: true,
    plans: ["Starter", "Pro"],
    updatedAt: "2026-10-30T08:00:00Z",
    updatedByName: "Ada Admin",
  }),
];

// What the catalog returns; a test may swap in a longer list.
let catalog = features;

vi.mock("@/hooks/queries/use-admin-features", () => ({
  useAdminFeatures: () => ({ data: catalog, isLoading: false }),
}));

vi.mock("@/hooks/mutations/use-update-admin-feature", () => ({
  useUpdateAdminFeature: () => ({ mutate, isPending: false }),
}));

describe("FeatureCatalogPanel", () => {
  it("groups the features and shows how each is offered", () => {
    render(<FeatureCatalogPanel />);

    expect(screen.getByText(/3 features in 2 groups/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Video" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Safety caps" })).toBeInTheDocument();

    const veo = screen.getByRole("row", { name: /^AI video \(Veo\)/ });
    expect(within(veo).getByText("Not in trial")).toBeInTheDocument();
    expect(within(veo).getByLabelText("Pro: included")).toBeInTheDocument();
    expect(within(veo).getByLabelText("Starter: not included")).toBeInTheDocument();

    const landscape = screen.getByRole("row", { name: /^Landscape video/ });
    expect(within(landscape).getByText("Hidden")).toBeInTheDocument();
    expect(within(landscape).getByText("In no plan")).toBeInTheDocument();

    const cap = screen.getByRole("row", { name: /^Daily mockup safety cap/ });
    expect(within(cap).getByLabelText("Starter: included")).toBeInTheDocument();
    expect(within(cap).getByText("Default 300 per day")).toBeInTheDocument();
    expect(within(cap).getByText(/Edited .* by Ada Admin/)).toBeInTheDocument();
  });

  it("filters by what needs a look, and searches by name or code", () => {
    render(<FeatureCatalogPanel />);

    fireEvent.click(screen.getByRole("button", { name: /^In no plan/ }));
    expect(screen.getByRole("row", { name: /^Landscape video/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^AI video \(Veo\)/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    fireEvent.change(screen.getByLabelText("Search features"), { target: { value: "mockup_cap" } });
    expect(screen.getByRole("row", { name: /^Daily mockup safety cap/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^Landscape video/ })).not.toBeInTheDocument();
  });

  it("saves an edited label without the limit fields on an on/off feature", async () => {
    render(<FeatureCatalogPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Edit AI video (Veo)" }));
    expect(screen.queryByLabelText("Unit")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Veo videos" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate).toHaveBeenCalledWith({
      code: "ai_video",
      input: expect.objectContaining({ label: "Veo videos", unit: null, defaultLimit: null, trialAvailable: false, sortOrder: 70 }),
    });
  });

  it("refuses an empty label", async () => {
    mutate.mockClear();
    render(<FeatureCatalogPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Daily mockup safety cap" }));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a label.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows ten features a page and starts again at page one on a new search", () => {
    catalog = Array.from({ length: 12 }, (_, index) => feature({ code: `feature_${index + 1}`, label: `Feature ${index + 1}` }));
    try {
      render(<FeatureCatalogPanel />);

      expect(screen.getByText("1–10 of 12")).toBeInTheDocument();
      expect(screen.getByRole("row", { name: /^Feature 10/ })).toBeInTheDocument();
      expect(screen.queryByRole("row", { name: /^Feature 11/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Next/ }));
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
      expect(screen.getByRole("row", { name: /^Feature 12/ })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Search features"), { target: { value: "Feature" } });
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    } finally {
      catalog = features;
    }
  });
});
