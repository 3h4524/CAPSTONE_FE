import { beforeEach, describe, expect, it, vi } from "vitest";

import { MockupImageEditDialog } from "@/components/batch-jobs/mockup-image-edit-dialog";
import { GARMENT_COLORS, garmentColorName } from "@/helpers/garment-colors";
import { renderWithQuery } from "@/test/render-with-query";
import type { MockupImage, MockupTemplate } from "@/types/mockup-templates";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  saveOne: vi.fn(),
  saveMany: vi.fn(),
  reset: vi.fn(),
  templates: [] as unknown[],
}));

vi.mock("@/api/mockup-templates", () => ({
  saveMockupOverride: mocks.saveOne,
  saveMockupOverrides: mocks.saveMany,
  resetMockupOverride: mocks.reset,
}));
vi.mock("@/hooks/queries/use-mockup-templates", () => ({
  useMockupTemplates: () => ({ data: mocks.templates, isPending: false }),
}));
// The photo editor measures a live image; what is saved does not depend on it.
vi.mock("@/components/mockups/print-area-editor", () => ({ PrintAreaEditor: () => null }));

const FRONT = "11111111-1111-4111-8111-111111111111";
const BACK = "22222222-2222-4222-8222-222222222222";
const DESIGN = "33333333-3333-4333-8333-333333333333";
const compact = (id: string) => id.replace(/-/g, "");

const photo = (id: string, config: string) =>
  ({
    id,
    name: id === FRONT ? "Boxy Tee" : "Boxy Tee - Back",
    productType: "tshirt",
    baseImageUrl: `https://cdn/${id}.jpg`,
    printAreaConfig: config,
    outputWidthPx: 1000,
    outputHeightPx: 1000,
    allowRecolor: true,
    garmentMaskUrl: `https://cdn/${id}-mask.png`,
    allowBackground: true,
  }) as unknown as MockupTemplate;

const back = photo(
  BACK,
  `{"x":100,"y":100,"width":300,"height":300,"view":"back","mainTemplateId":"${FRONT}"}`
);
const tee = {
  ...photo(FRONT, '{"x":100,"y":100,"width":300,"height":300}'),
  views: [back],
} as MockupTemplate;

const mockup = (id: string, templateId: string, color = "FFFFFF") =>
  ({
    id,
    productId: "p1",
    designImageId: DESIGN,
    mockupTemplateId: templateId,
    mockupImageUrl: `https://cdn/${id}.jpg`,
    mockupWidthPx: 1000,
    mockupHeightPx: 1000,
    approvalStatus: "pending",
    garmentColor: `#${color}`,
    backgroundColor: null,
    slotKey: `${compact(DESIGN)}.${compact(templateId)}.${color}`,
    override: null,
  }) as MockupImage;

describe("MockupImageEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.templates = [tee];
    mocks.saveMany.mockResolvedValue({
      generatedCount: 0,
      noDesignImageCount: 0,
      noCompatibleTemplateCount: 0,
      errors: [],
      images: [],
    });
  });

  it("gives every side of the mock-up the garment color picked, whichever side is open", async () => {
    const front = mockup("front", FRONT);
    const backMockup = mockup("back", BACK);
    const onSaved = vi.fn();
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={backMockup}
        images={[front, backMockup]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={onSaved}
      />
    );
    const black = GARMENT_COLORS.find((color) => color.hex.toLowerCase() !== "#ffffff")!.hex;

    await userEvent.click(await screen.findByRole("button", { name: "White" }));
    await userEvent.click(screen.getByRole("button", { name: garmentColorName(black) }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    expect(saved.map((change: { slotKey: string }) => change.slotKey).sort()).toEqual(
      [backMockup.slotKey, front.slotKey].sort()
    );
    expect(
      saved.every(
        (change: { override: { garmentColor: string } }) => change.override.garmentColor === black
      )
    ).toBe(true);
    expect(mocks.saveOne).not.toHaveBeenCalled();
  });

  it("removes the side taken off and recolors the one kept", async () => {
    const front = mockup("front", FRONT);
    const backMockup = mockup("back", BACK);
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={front}
        images={[front, backMockup]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const navy = GARMENT_COLORS.find((color) => color.hex.toLowerCase() !== "#ffffff")!.hex;

    await userEvent.click(await screen.findByRole("button", { name: "White" }));
    await userEvent.click(screen.getByRole("button", { name: garmentColorName(navy) }));
    await userEvent.click(screen.getByRole("button", { name: "Remove side" }));
    // The side taken off is marked as removed, not shown in its old color.
    expect(screen.getByRole("tab", { name: "Front" })).toHaveClass("border-dashed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    const bySlot = new Map(
      saved.map((change: { slotKey: string; override: object }) => [
        change.slotKey,
        change.override,
      ])
    );
    expect(bySlot.get(front.slotKey)).toMatchObject({ removed: true });
    expect(bySlot.get(backMockup.slotKey)).toMatchObject({ garmentColor: navy });
  });

  it("gives a side removed before the new color too, so it comes back looking like the others", async () => {
    const front = mockup("front", FRONT);
    const removedBack = {
      slotKey: mockup("back", BACK).slotKey!,
      productId: "p1",
      designImageId: DESIGN,
      mockupTemplateId: BACK,
      templateName: "Boxy Tee - Back",
      garmentColor: "#FFFFFF",
    };
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={front}
        images={[front]}
        removedSlots={[removedBack]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    const navy = GARMENT_COLORS.find((color) => color.hex.toLowerCase() !== "#ffffff")!.hex;

    await userEvent.click(await screen.findByRole("button", { name: "White" }));
    await userEvent.click(screen.getByRole("button", { name: garmentColorName(navy) }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    const back = saved.find(
      (change: { slotKey: string }) => change.slotKey === removedBack.slotKey
    );
    expect(back.override).toMatchObject({
      removed: true,
      garmentColor: navy,
      mockupTemplateId: BACK,
    });
  });

  it("adds a color ticked as new mock-ups of every side, and leaves the color already there as it is", async () => {
    const front = mockup("front", FRONT);
    const backMockup = mockup("back", BACK);
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={front}
        images={[front, backMockup]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Black" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    expect(saved).toEqual([
      {
        slotKey: `${compact(DESIGN)}.${compact(FRONT)}.1A1A1A`,
        replacedMockupImageId: null,
        override: expect.objectContaining({ mockupTemplateId: FRONT, garmentColor: "#1A1A1A" }),
      },
      {
        slotKey: `${compact(DESIGN)}.${compact(BACK)}.1A1A1A`,
        replacedMockupImageId: null,
        override: expect.objectContaining({ mockupTemplateId: BACK, garmentColor: "#1A1A1A" }),
      },
    ]);
  });

  it("removes every side of a color unticked, whichever color the card shows", async () => {
    const whiteFront = mockup("white-front", FRONT);
    const whiteBack = mockup("white-back", BACK);
    const blackFront = mockup("black-front", FRONT, "1A1A1A");
    const blackBack = mockup("black-back", BACK, "1A1A1A");
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={whiteFront}
        images={[whiteFront, whiteBack, blackFront, blackBack]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(await screen.findByRole("button", { name: "Black" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await userEvent.click(screen.getByRole("button", { name: "Black" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    expect(
      saved.map((change: { slotKey: string; override: { removed?: boolean } }) => [
        change.slotKey,
        change.override.removed,
      ])
    ).toEqual([
      [blackFront.slotKey, true],
      [blackBack.slotKey, true],
    ]);
  });

  it("keeps each garment color's own background, and changes only the one picked", async () => {
    const whiteFront = { ...mockup("white-front", FRONT), backgroundColor: "#8A929E" };
    const whiteBack = { ...mockup("white-back", BACK), backgroundColor: "#8A929E" };
    const blackFront = mockup("black-front", FRONT, "1A1A1A");
    const blackBack = mockup("black-back", BACK, "1A1A1A");
    renderWithQuery(
      <MockupImageEditDialog
        batchJobId="job-1"
        image={whiteFront}
        images={[whiteFront, whiteBack, blackFront, blackBack]}
        productName="Dragon Tee"
        productType="tshirt"
        designImageUrl={null}
        onOpenChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // The white garment shows its gray background; the black one has none.
    expect(await screen.findByRole("button", { name: "Gray background" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await userEvent.click(screen.getByRole("button", { name: "Background for the Black garment" }));
    expect(screen.getByRole("button", { name: "Original" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await userEvent.click(screen.getByRole("button", { name: "Sand background" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.saveMany).toHaveBeenCalledTimes(1));
    const [, saved] = mocks.saveMany.mock.calls[0];
    expect(
      saved.map((change: { slotKey: string; override: { backgroundColor: string | null } }) => [
        change.slotKey,
        change.override.backgroundColor,
      ])
    ).toEqual([
      [blackFront.slotKey, "#EDE6DA"],
      [blackBack.slotKey, "#EDE6DA"],
    ]);
  });
});
