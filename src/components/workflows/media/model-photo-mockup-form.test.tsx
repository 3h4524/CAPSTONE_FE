import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotoMockupForm } from "@/components/workflows/media/model-photo-mockup-form";
import type { MockupTemplate } from "@/types/mockup-templates";
import type { MockupAsset } from "@/types/video-workflow";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  importMockups: vi.fn(),
  preview: vi.fn(),
  showToast: vi.fn(),
  photos: [] as MockupTemplate[],
}));

vi.mock("@/helpers/toast", () => ({ showToast: mocks.showToast }));
vi.mock("@/hooks/mutations/use-generate-model-photo-mockup", () => ({
  useGenerateModelPhotoMockup: () => ({ mutate: mocks.generate, isPending: false }),
}));
vi.mock("@/hooks/mutations/use-import-generated-mockups", () => ({
  useImportGeneratedMockups: () => ({ mutate: mocks.importMockups, isPending: false }),
}));
vi.mock("@/hooks/queries/use-model-photos", () => ({
  useModelPhotos: () => ({ data: mocks.photos, isPending: false, isError: false }),
}));
vi.mock("@/hooks/queries/use-model-photo-preview", () => ({
  useModelPhotoPreview: (input: unknown) => {
    mocks.preview(input);
    return {
      data: { url: "https://res.cloudinary.com/demo/image/upload/preview.png" },
      isPending: false,
      isError: false,
      error: null,
    };
  },
}));

const asset = (overrides: Partial<MockupAsset>): MockupAsset => ({
  id: "mockup-1",
  productId: "product-1",
  sourceType: "generated",
  role: "Hero",
  artworkGroupKey: "design-1",
  variantKey: "#1F2A44",
  revision: 1,
  approvalStatus: "pending",
  approvedRevision: null,
  width: 1000,
  height: 1000,
  regions: { focalPoint: null, product: null, artwork: null, detail: null },
  previewUrl: "https://signed.example/mockup.png",
  warnings: [],
  ...overrides,
});

const modelPhoto = (overrides: Partial<MockupTemplate>): MockupTemplate => ({
  id: "model-1",
  name: "Studio model",
  productType: "tshirt",
  baseImageUrl: "https://res.cloudinary.com/demo/image/upload/model.jpg",
  previewImageUrl: null,
  printAreaConfig: "{}",
  outputWidthPx: 1000,
  outputHeightPx: 1500,
  usageCount: 0,
  isSystemTemplate: true,
  isMine: false,
  realisticPrintReady: true,
  allowRecolor: true,
  garmentMaskUrl: null,
  garmentColor: null,
  kind: "model",
  ...overrides,
});

describe("ModelPhotoMockupForm", () => {
  beforeEach(() => {
    mocks.generate.mockReset();
    mocks.photos = [
      modelPhoto({}),
      modelPhoto({ id: "model-2", name: "Not analyzed", realisticPrintReady: false }),
    ];
  });

  it("adds the product's newest mock-ups once, when the section is first opened", async () => {
    mocks.importMockups.mockClear();
    const user = userEvent.setup();
    render(<ModelPhotoMockupForm productId="product-1" assets={[asset({})]} />);

    const section = screen.getByRole("button", { name: /put on a model photo/i });
    await user.click(section);
    await user.click(section);
    await user.click(section);

    expect(mocks.importMockups).toHaveBeenCalledTimes(1);
    expect(mocks.importMockups).toHaveBeenCalledWith("product-1");
  });

  it("without a mock-up made from a design, offers to add the product's mock-ups", async () => {
    const user = userEvent.setup();
    render(
      <ModelPhotoMockupForm
        productId="product-1"
        assets={[asset({ sourceType: "uploaded" }), asset({ id: "lifestyle", role: "Lifestyle" })]}
      />
    );

    await user.click(screen.getByRole("button", { name: /put on a model photo/i }));
    await user.click(screen.getByRole("button", { name: /add this product’s mock-ups/i }));

    expect(mocks.importMockups).toHaveBeenCalledWith("product-1", expect.anything());
    expect(screen.queryByRole("radiogroup", { name: "Model photo" })).not.toBeInTheDocument();
  });

  it("with one model photo, puts the mock-up on it in the mock-up's own color without asking", async () => {
    const user = userEvent.setup();
    render(
      <ModelPhotoMockupForm
        productId="product-1"
        assets={[asset({}), asset({ id: "lifestyle", role: "Lifestyle" })]}
      />
    );

    await user.click(screen.getByRole("button", { name: /put on a model photo/i }));
    expect(screen.queryByRole("radio", { name: /not analyzed/i })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /studio model/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Put on model photo" });
    expect(submit).toBeEnabled();

    expect(screen.getByRole("img", { name: "The mock-up on the model photo" })).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/image/upload/preview.png"
    );
    expect(mocks.preview).toHaveBeenLastCalledWith({
      productId: "product-1",
      garmentMockupId: "mockup-1",
      modelPhotoId: "model-1",
      garmentColor: null,
    });
    await user.click(submit);

    expect(mocks.generate).toHaveBeenCalledWith(
      {
        productId: "product-1",
        garmentMockupId: "mockup-1",
        modelPhotoId: "model-1",
        garmentColor: null,
      },
      expect.anything()
    );
  });

  it("with several model photos, waits for one to be chosen", async () => {
    mocks.photos = [modelPhoto({}), modelPhoto({ id: "model-2", name: "Street model" })];
    const user = userEvent.setup();
    render(<ModelPhotoMockupForm productId="product-1" assets={[asset({})]} />);

    await user.click(screen.getByRole("button", { name: /put on a model photo/i }));
    expect(screen.getByRole("button", { name: "Put on model photo" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /street model/i }));
    await user.click(screen.getByRole("button", { name: "Put on model photo" }));

    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({ modelPhotoId: "model-2", garmentColor: null }),
      expect.anything()
    );
  });
});
