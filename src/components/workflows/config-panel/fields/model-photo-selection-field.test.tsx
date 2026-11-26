import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotoSelectionField } from "@/components/workflows/config-panel/fields/model-photo-selection-field";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  counts: { tshirt: 3, hoodie: 1 } as Record<string, number> | undefined,
  lifestyle: true as boolean | undefined,
}));

vi.mock("@/hooks/use-run-product-types", () => ({
  useRunProductTypeCounts: () => mocks.counts,
}));
vi.mock("@/hooks/queries/use-entitlements", () => ({
  useEntitlements: () => ({
    data: mocks.lifestyle === undefined ? undefined : { features: [{ code: "lifestyle_mockup", isEnabled: mocks.lifestyle }] },
  }),
}));
vi.mock("@/hooks/queries/use-model-photos", () => ({
  useModelPhotos: (_scope: string, productType?: string) => ({
    data:
      productType === "tshirt"
        ? [
            { id: "ava", name: "Ava", baseImageUrl: "https://example.com/ava.jpg", attributes: null, isSystemTemplate: true },
            { id: "mia", name: "Mia", baseImageUrl: "https://example.com/mia.jpg", attributes: null, isSystemTemplate: false },
          ]
        : [],
    isPending: false,
    isError: false,
  }),
}));

const rowOf = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

describe("ModelPhotoSelectionField", () => {
  beforeEach(() => {
    mocks.counts = { tshirt: 3, hoodie: 1 };
    mocks.lifestyle = true;
  });

  it("chooses a model photo for one product type of the run", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{}} onChange={onChange} />);

    expect(within(rowOf("Hoodie")).getByText("No model photo")).toBeInTheDocument();
    await user.click(within(rowOf("T-shirt")).getByRole("button", { name: "Choose" }));
    await user.click(screen.getByRole("radio", { name: /Mia/ }));

    expect(onChange).toHaveBeenCalledWith({ tshirt: "mia" });
  });

  it("shows the chosen photo and removes it, keeping the other types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{ tshirt: "ava", hoodie: "someone" }} onChange={onChange} />);

    expect(within(rowOf("T-shirt")).getByText("Ava")).toBeInTheDocument();
    // A photo deleted since it was chosen: the run would refuse it.
    expect(within(rowOf("Hoodie")).getByText(/no longer available/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove the model photo for T-shirt" }));

    expect(onChange).toHaveBeenCalledWith({ hoodie: "someone" });
  });

  it("keeps a type the run no longer has, marked unused, so it can be removed", () => {
    mocks.counts = { hoodie: 2 };
    render(<ModelPhotoSelectionField value={{ tshirt: "ava" }} onChange={vi.fn()} />);

    expect(within(rowOf("T-shirt")).getByText("Not used in this run")).toBeInTheDocument();
    expect(within(rowOf("Hoodie")).queryByText("Not used in this run")).not.toBeInTheDocument();
  });

  it("is locked without lifestyle images on the plan, but a choice can still be removed", async () => {
    mocks.lifestyle = false;
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{ tshirt: "ava" }} onChange={onChange} />);

    expect(screen.getByText(/part of Pro/i)).toBeInTheDocument();
    expect(within(rowOf("T-shirt")).getByRole("button", { name: "Change" })).toBeDisabled();
    expect(within(rowOf("Hoodie")).getByRole("button", { name: "Choose" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove the model photo for T-shirt" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("asks for a batch before there is a product type to choose for", () => {
    mocks.counts = undefined;
    render(<ModelPhotoSelectionField value={{}} onChange={vi.fn()} />);

    expect(screen.getByText(/choose a batch in product input/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose" })).not.toBeInTheDocument();
  });
});
