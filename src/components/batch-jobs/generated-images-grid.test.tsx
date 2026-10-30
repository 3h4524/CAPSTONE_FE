import { describe, expect, it, vi } from "vitest";

import { GeneratedImagesGrid } from "@/components/batch-jobs/generated-images-grid";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const BLOCKED =
  "Generation blocked by Ideogram: the image failed its safety or copyright check (it may show a real brand or character).";

const product = (overrides: Partial<BatchJobProductResult>): BatchJobProductResult => ({
  id: "row-1",
  productId: "product-1",
  productName: "Surf Van",
  productType: "tshirt",
  sequence: 1,
  status: "image_review_required",
  errorMessage: null,
  images: [],
  ...overrides,
});

const image = { id: "image-1", imageUrl: "https://img.example/1.png", variationIndex: 1, widthPx: 512, heightPx: 512, approvalStatus: "pending" };

describe("GeneratedImagesGrid", () => {
  it("shows a product left without designs, with the reason and a way to generate it again", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    const failed = product({ status: "failed", errorMessage: `${BLOCKED} Change the prompt and generate it again.` });
    render(<GeneratedImagesGrid products={[failed]} onPreview={vi.fn()} onRegenerate={onRegenerate} />);

    expect(screen.getByRole("alert")).toHaveTextContent("real brand or character");
    await user.click(screen.getByRole("button", { name: /Edit & regenerate/ }));

    expect(onRegenerate).toHaveBeenCalledWith(failed);
  });

  it("notes the designs that were blocked beside the ones that were made", () => {
    render(
      <GeneratedImagesGrid
        products={[product({ errorMessage: `1 of 2 designs was blocked. ${BLOCKED}`, images: [image] })]}
        onPreview={vi.fn()}
      />
    );

    expect(screen.getByText(/1 of 2 designs was blocked/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /variation 1 larger/ })).toBeInTheDocument();
  });

  it("leaves out a product that is still waiting for its first designs", () => {
    render(<GeneratedImagesGrid products={[product({ status: "generating_image" })]} onPreview={vi.fn()} />);

    expect(screen.queryByText("Surf Van")).not.toBeInTheDocument();
  });

  it("hides the reason while the product is being generated again", () => {
    const { container } = render(
      <GeneratedImagesGrid
        products={[product({ status: "generating_image", errorMessage: "1 of 2 designs was blocked.", images: [image] })]}
        onPreview={vi.fn()}
        onRegenerate={vi.fn()}
      />
    );

    expect(within(container).queryByText(/was blocked/)).not.toBeInTheDocument();
    expect(screen.getByText("Generating new designs…")).toBeInTheDocument();
  });
});
