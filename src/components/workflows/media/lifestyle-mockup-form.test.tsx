import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type LifestyleGarment,
  LifestyleMockupForm,
} from "@/components/workflows/media/lifestyle-mockup-form";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ generate: vi.fn(), showToast: vi.fn() }));

vi.mock("@/helpers/toast", () => ({ showToast: mocks.showToast }));
vi.mock("@/hooks/mutations/use-generate-lifestyle-mockup", () => ({
  useGenerateLifestyleMockup: () => ({ mutateAsync: mocks.generate }),
}));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({
  useMockupAssets: () => ({ data: [] }),
}));
vi.mock("@/hooks/queries/use-model-photos", () => ({
  useModelPhotos: () => ({
    data: [
      {
        id: "family-photo",
        name: "Family in white tees",
        baseImageUrl: "https://example.com/family.jpg",
        attributes: { people: "group", groupType: "family" },
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

const garments: LifestyleGarment[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productId: "product-1",
    label: "Tee · #1F2A44",
    imageUrl: "https://example.com/navy.png",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productId: "product-2",
    label: "Hoodie · #FFFFFF",
    imageUrl: "https://example.com/white.png",
  },
];

const photo = () => new File(["photo"], "model.jpg", { type: "image/jpeg" });

// Opens the form, ticks the mockups named (besides the first, ticked already) and adds the photo.
const prepare = async (user: ReturnType<typeof userEvent.setup>, tick: RegExp[], file: File) => {
  await user.click(screen.getByRole("button", { name: /ai lifestyle image/i }));
  await user.click(screen.getByRole("button", { name: "Change" }));
  for (const name of tick) await user.click(screen.getByRole("checkbox", { name }));
  await user.click(screen.getByRole("button", { name: "Done" }));
  await user.upload(screen.getByLabelText("Photo of a model"), file);
  await user.click(screen.getByRole("checkbox", { name: /rights to this photo/i }));
};

describe("LifestyleMockupForm", () => {
  beforeEach(() => {
    mocks.generate.mockReset();
    mocks.showToast.mockReset();
  });

  it("makes one lifestyle image per mockup ticked, from the same photo", async () => {
    mocks.generate.mockResolvedValue({});
    const user = userEvent.setup();
    const file = photo();
    render(<LifestyleMockupForm garments={garments} />);

    await prepare(user, [/hoodie/i], file);
    await user.click(screen.getByRole("button", { name: "Generate 2 lifestyle images" }));

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2));
    expect(mocks.generate.mock.calls.map(([request]) => request)).toEqual([
      { productId: "product-1", garmentMockupId: garments[0].id, file },
      { productId: "product-2", garmentMockupId: garments[1].id, file },
    ]);
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        "success",
        expect.stringContaining("2 lifestyle images created")
      )
    );
  });

  it("goes on with the other mockups when one fails, and says which", async () => {
    mocks.generate.mockRejectedValueOnce(new Error("Ideogram declined")).mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<LifestyleMockupForm garments={garments} />);

    await prepare(user, [/hoodie/i], photo());
    await user.click(screen.getByRole("button", { name: "Generate 2 lifestyle images" }));

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("Tee · #1F2A44")
      )
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      "success",
      expect.stringContaining("1 lifestyle image created")
    );
  });

  it("sends the requests for all the mockups ticked at once", async () => {
    const many: LifestyleGarment[] = [1, 2, 3, 4, 5].map((n) => ({
      id: `${String(n).repeat(8)}-1111-4111-8111-111111111111`,
      productId: "product-1",
      label: `Tee number ${n}`,
      imageUrl: `https://example.com/${n}.png`,
    }));
    const pending: Array<(value: unknown) => void> = [];
    mocks.generate.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const user = userEvent.setup();
    render(<LifestyleMockupForm garments={many} />);

    await prepare(user, [/number 2/, /number 3/, /number 4/, /number 5/], photo());
    await user.click(screen.getByRole("button", { name: "Generate 5 lifestyle images" }));

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(5));
    expect(screen.getByRole("button", { name: "Generating… 0 of 5 done" })).toBeDisabled();
    pending.forEach((resolve) => resolve({}));
    await waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith(
        "success",
        expect.stringContaining("5 lifestyle images created")
      )
    );
  });
  it("asks for the rights to an uploaded photo before making anything", async () => {
    const user = userEvent.setup();
    render(<LifestyleMockupForm garments={garments} />);

    await user.click(screen.getByRole("button", { name: /ai lifestyle image/i }));
    await user.upload(
      screen.getByLabelText("Photo of a model"),
      new File(["photo"], "model.jpg", { type: "image/jpeg" })
    );
    await user.click(screen.getByRole("button", { name: "Generate lifestyle image" }));

    expect(
      await screen.findByText("Confirm you have the rights to this photo.")
    ).toBeInTheDocument();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("dresses a model photo from the library instead of an upload", async () => {
    mocks.generate.mockResolvedValue({});
    const user = userEvent.setup();
    render(<LifestyleMockupForm garments={garments} />);

    await user.click(screen.getByRole("button", { name: /ai lifestyle image/i }));
    await user.click(screen.getByRole("button", { name: "From model photos" }));
    await user.click(screen.getByRole("radio", { name: /family/i }));
    await user.click(screen.getByRole("button", { name: "Generate lifestyle image" }));

    await waitFor(() =>
      expect(mocks.generate).toHaveBeenCalledWith(
        { productId: "product-1", garmentMockupId: garments[0].id, modelPhotoId: "family-photo" },
        expect.anything()
      )
    );
  });
});
