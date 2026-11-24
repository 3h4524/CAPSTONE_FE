import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotoFormDialog } from "@/components/mockups/model-photo-form-dialog";
import { buildMockupTemplate } from "@/test/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  printWithoutAi: false,
  preview: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => mocks.printWithoutAi }));
vi.mock("@/hooks/mutations/use-model-photo-mutations", () => ({
  useSaveModelPhoto: () => ({ mutate: mocks.save, isPending: false }),
}));
vi.mock("@/api/model-photos", () => ({ previewModelPhoto: mocks.preview }));
vi.mock("@/components/mockups/garment-selection-editor", () => ({
  GarmentSelectionEditor: () => <p>garment editor</p>,
  selectionToDataUrl: () => "data:image/png;base64,",
  selectionToPng: () => Promise.resolve(new Blob()),
}));
vi.mock("@/components/mockups/print-quad-editor", () => ({ PrintQuadEditor: () => null }));

const photo = buildMockupTemplate({
  id: "photo-1",
  kind: "model",
  name: "Adult · Male",
  productType: "tshirt",
  printAreaConfig: '{"x":10,"y":20,"width":30,"height":40,"unit":"px","auto":true}',
  attributes: { people: "single", ageGroup: "adult", gender: "male" },
});

describe("ModelPhotoFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.printWithoutAi = false;
    mocks.preview.mockResolvedValue({ recolorable: false, reason: null, maskDataUrl: null });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ blob: () => Promise.resolve(new Blob(["photo"], { type: "image/jpeg" })) })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("asks only for the photo and who is in it while mock-ups are put on with AI", async () => {
    render(<ModelPhotoFormDialog open photo={photo} scope="seller" onClose={vi.fn()} />);

    expect(screen.queryByText("1. The garment")).not.toBeInTheDocument();
    expect(screen.queryByText("2. Where the design goes")).not.toBeInTheDocument();
    expect(mocks.preview).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0]).toMatchObject({
      id: "photo-1",
      garmentSelection: null,
      findGarment: false,
      autoPlacement: true,
      printQuad: null,
    });
  });

  it("finds the garment again on a photo saved without one once printing without AI is back on", async () => {
    mocks.printWithoutAi = true;
    render(<ModelPhotoFormDialog open photo={photo} scope="seller" onClose={vi.fn()} />);

    expect(screen.getByText("1. The garment")).toBeInTheDocument();
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(1));
  });
});
