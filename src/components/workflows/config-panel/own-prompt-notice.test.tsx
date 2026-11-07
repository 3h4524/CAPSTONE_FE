import { beforeEach, describe, expect, it, vi } from "vitest";

import { OwnPromptNotice, ownPromptProducts } from "@/components/workflows/config-panel/own-prompt-notice";
import type { Product } from "@/types/batches";
import { render, screen } from "@testing-library/react";

const { batchProducts } = vi.hoisted(() => ({ batchProducts: { data: undefined as Product[] | undefined } }));

vi.mock("@/hooks/queries/use-batch-products", () => ({
  useBatchProducts: () => batchProducts,
}));

vi.mock("@/stores/workflow", () => ({
  useWorkflowStore: (select: (state: unknown) => unknown) =>
    select({ nodes: [{ data: { type: "product-input", config: { batchId: "batch-1" } } }] }),
}));

const product = (name: string, overrides: Partial<Product> = {}): Product => ({
  id: name,
  batchId: "batch-1",
  name,
  productType: "tshirt",
  niche: null,
  keywords: [],
  productDescription: null,
  sourceNotes: null,
  customPrompt: null,
  status: "pending",
  createdAt: null,
  ...overrides,
});

describe("OwnPromptNotice", () => {
  beforeEach(() => {
    batchProducts.data = undefined;
  });

  it("names the products to run whose own image prompt replaces the template and art style", () => {
    batchProducts.data = [
      product("Stay Creative", { customPrompt: "Retro typography with doodles" }),
      product("Good Things Take Time", { customPrompt: "A flower growing toward the sun" }),
      product("Create Your Own Sunshine"),
      // Already generated: the run leaves it alone.
      product("Old Product", { customPrompt: "Anything", status: "image_review_required" }),
    ];

    render(<OwnPromptNotice />);

    const notice = screen.getByText(/2 of 3 products to run have their own image prompt/);
    expect(notice).toHaveTextContent("Stay Creative, Good Things Take Time.");
    expect(notice).toHaveTextContent("The design template and art style chosen here don't apply to them");
    expect(notice).not.toHaveTextContent("Old Product");
  });

  it("speaks of one product in the singular and names at most three", () => {
    batchProducts.data = [product("Solo", { customPrompt: "A lighthouse" })];
    const { unmount } = render(<OwnPromptNotice />);
    expect(screen.getByText(/1 of 1 product to run has its own image prompt: Solo\./)).toHaveTextContent("don't apply to it: its prompt");
    unmount();

    batchProducts.data = ["A", "B", "C", "D", "E"].map((name) => product(name, { customPrompt: "Own" }));
    render(<OwnPromptNotice />);
    expect(screen.getByText(/5 of 5 products/)).toHaveTextContent("A, B, C and 2 more.");
  });

  it("shows nothing when no product to run has its own image prompt", () => {
    batchProducts.data = [product("Plain"), product("Blank", { customPrompt: "   " })];
    const { container } = render(<OwnPromptNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("finds the pending products with a non-empty image prompt", () => {
    const own = product("Own", { customPrompt: "A fox" });
    expect(ownPromptProducts([own, product("None"), product("Done", { customPrompt: "A fox", status: "approved" })])).toEqual([own]);
  });
});
