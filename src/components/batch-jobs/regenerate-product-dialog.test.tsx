import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type RegenerateDefaults,
  RegenerateProductDialog,
} from "@/components/batch-jobs/regenerate-product-dialog";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/hooks/mutations/use-regenerate-batch-job-product", () => ({
  useRegenerateBatchJobProduct: () => ({ mutate, isPending: false }),
}));

vi.mock("@/hooks/queries/use-design-templates", () => ({
  useDesignTemplates: () => ({
    data: {
      items: [
        {
          id: "template-1",
          name: "Bold Rally",
          isSystemTemplate: true,
          nicheCategory: null,
          artStyle: null,
          previewImageUrl: null,
          styleDescription: null,
        },
      ],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/queries/use-style-presets", () => ({
  useStylePresets: () => ({
    data: [{ id: "style-1", name: "Watercolor", description: "", previewImageUrl: null, recommendations: [] }],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const product = (overrides: Partial<BatchJobProductResult> = {}): BatchJobProductResult => ({
  id: "row-1",
  productId: "product-1",
  productName: "Coffee Then Code",
  productType: "tshirt",
  sequence: 1,
  status: "image_review_required",
  errorMessage: null,
  images: [],
  designText: "Coffee Then Code",
  customPrompt: null,
  designTemplateId: null,
  instructions: null,
  ...overrides,
});

// What the workflow is set to now.
const defaults: RegenerateDefaults = {
  variationCount: 2,
  designTemplateId: "template-1",
  stylePresetId: "style-1",
  instructions: "keep it retro",
};

const renderDialog = (regenerating: BatchJobProductResult) =>
  render(
    <RegenerateProductDialog
      batchJobId="job-1"
      product={regenerating}
      defaults={defaults}
      onOpenChange={vi.fn()}
    />
  );

describe("RegenerateProductDialog", () => {
  beforeEach(() => mutate.mockReset());

  it("opens More options with the workflow's template and art style chosen", async () => {
    const user = userEvent.setup();
    renderDialog(product());

    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByLabelText("Design template")).toHaveTextContent("Bold Rally");
    expect(screen.getByLabelText("Art style")).toHaveTextContent("Watercolor");
    expect(screen.getByLabelText("Extra instructions")).toHaveValue("keep it retro");
  });

  it("generates again from the workflow's settings and the chosen number of designs", async () => {
    const user = userEvent.setup();
    renderDialog(product());

    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        batchJobId: "job-1",
        rowId: "row-1",
        customPrompt: "",
        designText: "Coffee Then Code",
        variationCount: 1,
        instructions: "keep it retro",
        designTemplateId: "template-1",
        styleArtPresetId: "style-1",
      },
      expect.anything()
    );
  });

  it("leaves the template and art style alone for a product with its own image prompt", async () => {
    const user = userEvent.setup();
    renderDialog(product({ customPrompt: "A red fox asleep under a snowy pine." }));

    await user.click(screen.getByRole("button", { name: "More options" }));
    expect(screen.queryByLabelText("Design template")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Regenerate" }));

    const [input] = mutate.mock.calls[0];
    expect(input).not.toHaveProperty("designTemplateId");
    expect(input).not.toHaveProperty("styleArtPresetId");
    expect(input).toMatchObject({ customPrompt: "A red fox asleep under a snowy pine.", variationCount: 2 });
  });
});
