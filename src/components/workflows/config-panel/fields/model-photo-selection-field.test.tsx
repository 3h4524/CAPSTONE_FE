import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotoSelectionField } from "@/components/workflows/config-panel/fields/model-photo-selection-field";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  counts: { tshirt: 3, hoodie: 1 } as Record<string, number> | undefined,
  lifestyle: true as boolean | undefined,
  save: vi.fn(),
}));

vi.mock("@/hooks/mutations/use-model-photo-mutations", () => ({
  useSaveModelPhoto: () => ({ mutateAsync: mocks.save, isPending: false }),
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
  // The API lists a t-shirt's and a hoodie's model photos together for "apparel".
  useModelPhotos: (_scope: string, productType?: string) => ({
    data:
      productType === "apparel"
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
    mocks.counts = { tshirt: 3, hoodie: 1, tote_bag: 2 };
    mocks.lifestyle = true;
    mocks.save.mockReset();
  });

  it("shows t-shirts and hoodies as one apparel row, other product types on their own", () => {
    render(<ModelPhotoSelectionField value={{}} onChange={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(within(rowOf("Apparel")).getByText("No model photo")).toBeInTheDocument();
    expect(within(rowOf("Tote bag")).getByText("No model photo")).toBeInTheDocument();
    expect(screen.queryByText("T-shirt")).not.toBeInTheDocument();
    expect(screen.queryByText("Hoodie")).not.toBeInTheDocument();
  });

  it("chooses one model photo for every apparel product of the run", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{}} onChange={onChange} />);

    await user.click(within(rowOf("Apparel")).getByRole("button", { name: "Choose" }));
    await user.click(screen.getByRole("button", { name: "From model photos" }));
    await user.click(screen.getByRole("radio", { name: /Mia/ }));

    expect(onChange).toHaveBeenCalledWith({ apparel: "mia" });
  });

  it("uploads a photo of people once its rights are confirmed, and chooses it for the group", async () => {
    mocks.save.mockResolvedValue({ id: "uploaded" });
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{}} onChange={onChange} />);

    await user.click(within(rowOf("Apparel")).getByRole("button", { name: "Choose" }));
    // Upload comes first, as in the AI lifestyle image form.
    expect(screen.getByRole("button", { name: "Upload a photo" })).toHaveAttribute("aria-pressed", "true");
    const use = screen.getByRole("button", { name: "Use this photo" });
    expect(use).toBeDisabled();
    await user.upload(screen.getByLabelText("Photo of a model"), new File(["x"], "family.jpg", { type: "image/jpeg" }));
    expect(use).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(use);

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: null, productType: "tshirt", name: expect.stringMatching(/^family · /) })
    );
    expect(onChange).toHaveBeenCalledWith({ apparel: "uploaded" });
  });

  it("reads a photo saved under t-shirt or hoodie as the apparel one, and replaces it with the shared choice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{ tshirt: "ava", hoodie: "ava", tote_bag: "bag" }} onChange={onChange} />);

    expect(within(rowOf("Apparel")).getByText("Ava")).toBeInTheDocument();
    await user.click(within(rowOf("Apparel")).getByRole("button", { name: "Change" }));
    // A photo already chosen is a model photo: the picker opens on them.
    expect(screen.getByRole("button", { name: "From model photos" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("radio", { name: /Mia/ }));

    expect(onChange).toHaveBeenCalledWith({ tote_bag: "bag", apparel: "mia" });
  });

  it("shows the chosen photo and removes it, keeping the other groups", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{ apparel: "ava", tote_bag: "someone" }} onChange={onChange} />);

    expect(within(rowOf("Apparel")).getByText("Ava")).toBeInTheDocument();
    // A photo deleted since it was chosen: the run would refuse it.
    expect(within(rowOf("Tote bag")).getByText(/no longer available/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove the model photo for Apparel" }));

    expect(onChange).toHaveBeenCalledWith({ tote_bag: "someone" });
  });

  it("keeps a group the run no longer has, marked unused, so it can be removed", () => {
    mocks.counts = { tote_bag: 2 };
    render(<ModelPhotoSelectionField value={{ apparel: "ava" }} onChange={vi.fn()} />);

    expect(within(rowOf("Apparel")).getByText("Not used in this run")).toBeInTheDocument();
    expect(within(rowOf("Tote bag")).queryByText("Not used in this run")).not.toBeInTheDocument();
  });

  it("is locked without lifestyle images on the plan, but a choice can still be removed", async () => {
    mocks.lifestyle = false;
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelPhotoSelectionField value={{ apparel: "ava" }} onChange={onChange} />);

    expect(screen.getByText(/part of Pro/i)).toBeInTheDocument();
    expect(within(rowOf("Apparel")).getByRole("button", { name: "Change" })).toBeDisabled();
    expect(within(rowOf("Tote bag")).getByRole("button", { name: "Choose" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove the model photo for Apparel" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("asks for a batch before there is a product type to choose for", () => {
    mocks.counts = undefined;
    render(<ModelPhotoSelectionField value={{}} onChange={vi.fn()} />);

    expect(screen.getByText(/choose a batch in product input/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose" })).not.toBeInTheDocument();
  });
});
