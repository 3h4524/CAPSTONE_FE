import { beforeEach, describe, expect, it, vi } from "vitest";

import { MockupStripCard, ScrollStrip } from "@/components/workflows/run/mockup-strip";
import type { MockupAsset } from "@/types/video-workflow";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ review: vi.fn() }));

vi.mock("@/hooks/mutations/use-review-mockup-asset", () => ({
  useReviewMockupAsset: () => ({ mutate: mocks.review, isPending: false }),
}));

const asset = (overrides: Partial<MockupAsset> = {}): MockupAsset => ({
  id: "asset-1",
  productId: "product-1",
  sourceType: "generated",
  role: "Hero",
  artworkGroupKey: "design-1",
  variantKey: "#1A1A1A",
  revision: 3,
  approvalStatus: "pending",
  approvedRevision: null,
  width: 800,
  height: 800,
  regions: {} as MockupAsset["regions"],
  previewUrl: "https://example.com/mockup.png",
  warnings: [],
  ...overrides,
});

const renderCard = (overrides?: Partial<MockupAsset>) =>
  render(
    <ul>
      <MockupStripCard asset={asset(overrides)} />
    </ul>
  );

describe("MockupStripCard", () => {
  beforeEach(() => mocks.review.mockClear());

  it("approves the exact revision shown", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Approve mock-up" }));
    expect(mocks.review).toHaveBeenCalledWith({ id: "asset-1", revision: 3, approved: true });
  });

  it("rejects the exact revision shown", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Reject mock-up" }));
    expect(mocks.review).toHaveBeenCalledWith({ id: "asset-1", revision: 3, approved: false });
  });

  it("shows the state in words and marks the chosen button as pressed and inert", () => {
    renderCard({ approvalStatus: "approved", approvedRevision: 3 });
    expect(screen.getByText("Approved")).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "Approve mock-up" });
    expect(approve).toHaveAttribute("aria-pressed", "true");
    expect(approve).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject mock-up" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls an unreviewed mock-up 'To review'", () => {
    renderCard();
    expect(screen.getByText("To review")).toBeInTheDocument();
  });

  it("names the garment color only when the variant is a color", () => {
    const { container, rerender } = renderCard();
    expect(container.querySelector("[style*='background-color']")).not.toBeNull();
    rerender(
      <ul>
        <MockupStripCard asset={asset({ variantKey: "sleeve-long" })} />
      </ul>
    );
    expect(container.querySelector("[style*='background-color']")).toBeNull();
  });

  it("shows the first warning of the mock-up", () => {
    renderCard({ warnings: ["Artwork is small.", "Another"] });
    expect(screen.getByText("Artwork is small.")).toBeInTheDocument();
  });
});

describe("ScrollStrip", () => {
  it("is a labelled, keyboard-focusable list and offers no arrow while nothing is hidden", () => {
    render(
      <ScrollStrip label="Mock-ups of Design 2" itemCount={2}>
        <li>one</li>
        <li>two</li>
      </ScrollStrip>
    );
    const strip = screen.getByRole("list", { name: "Mock-ups of Design 2" });
    expect(strip).toHaveAttribute("tabindex", "0");
    // jsdom has no layout, so the strip fits and both arrows stay out of the tab order.
    expect(screen.getByRole("button", { name: "Show later mock-ups", hidden: true })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "Show earlier mock-ups", hidden: true })).toHaveAttribute("tabindex", "-1");
  });
});
