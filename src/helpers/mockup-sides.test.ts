import { describe, expect, it } from "vitest";

import {
  cardOfMockup,
  colorGroupOfMockup,
  groupMockupColors,
  groupMockupSides,
  slotSide,
  templateForView,
  templateSidesIndex,
} from "@/helpers/mockup-sides";
import type { MockupImage, MockupTemplate } from "@/types/mockup-templates";

const FRONT = "11111111-1111-1111-1111-111111111111";
const BACK = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";
const DESIGN = "44444444-4444-4444-4444-444444444444";

const template = (id: string, config: string, views?: MockupTemplate[]) =>
  ({ id, name: id, printAreaConfig: config, views }) as unknown as MockupTemplate;

const back = template(BACK, '{"x":1,"y":1,"width":10,"height":10,"view":"back"}');
const tee = template(FRONT, '{"x":1,"y":1,"width":10,"height":10}', [back]);
const plain = template(OTHER, '{"x":1,"y":1,"width":10,"height":10}');
const compact = (id: string) => id.replace(/-/g, "");

const mockup = (
  id: string,
  templateId: string,
  color = "FFFFFF",
  override?: MockupImage["override"]
) =>
  ({
    id,
    productId: "p1",
    designImageId: DESIGN,
    mockupTemplateId: override?.mockupTemplateId ?? templateId,
    mockupImageUrl: `https://cdn/${id}.jpg`,
    garmentColor: `#${color}`,
    slotKey: `${compact(DESIGN)}.${compact(templateId)}.${color}`,
    override: override ?? null,
  }) as unknown as MockupImage;

describe("groupMockupSides", () => {
  const index = templateSidesIndex([tee, plain]);

  it("puts the front and back of one design, template and color on one card, front first", () => {
    const cards = groupMockupSides(
      [mockup("b", BACK), mockup("f", FRONT), mockup("o", OTHER)],
      index
    );

    expect(cards.map((card) => card.sides.map((side) => `${side.view}:${side.image.id}`))).toEqual([
      ["front:f", "back:b"],
      ["front:o"],
    ]);
    expect(cardOfMockup(cards, "b")?.sides).toHaveLength(2);
  });

  it("keeps each garment color on its own card", () => {
    const cards = groupMockupSides(
      [mockup("f1", FRONT, "FFFFFF"), mockup("b1", BACK, "FFFFFF"), mockup("f2", FRONT, "1F2A44")],
      index
    );

    expect(cards.map((card) => card.sides.length)).toEqual([2, 1]);
  });

  it("keeps a side edited onto another template with its card", () => {
    const moved = mockup("b", BACK, "FFFFFF", {
      mockupTemplateId: OTHER,
      garmentColor: null,
      backgroundColor: null,
      printArea: null,
    });

    expect(groupMockupSides([mockup("f", FRONT), moved], index)).toHaveLength(1);
  });

  it("puts a back added to a mock-up moved onto a template with a back on that mock-up's card", () => {
    // The job makes the plain template; this mock-up was moved to the tee, and the tee's back was added beside it.
    const front = mockup("f", OTHER, "FFFFFF", {
      mockupTemplateId: FRONT,
      garmentColor: "#FFFFFF",
      backgroundColor: null,
      printArea: null,
    });
    const addedBack = mockup("b", BACK, "FFFFFF");

    const cards = groupMockupSides([front, addedBack, mockup("o", OTHER, "1F2A44")], index);

    expect(cards.map((card) => card.sides.map((side) => `${side.view}:${side.image.id}`))).toEqual([
      ["front:f", "back:b"],
      ["front:o"],
    ]);
  });

  it("puts a removed slot on the card of the sides that are left", () => {
    const front = mockup("f", FRONT);
    const backSlot = mockup("b", BACK).slotKey;

    const card = groupMockupSides([front], index)[0];
    expect(slotSide("p1", backSlot, index)).toEqual({
      cardKey: card.key,
      view: "back",
      mainId: FRONT,
    });
    expect(slotSide("p1", null, index)).toBeNull();
  });

  it("finds a template's photo of a side", () => {
    expect(templateForView(tee, "front")).toBe(tee);
    expect(templateForView(tee, "back")).toBe(back);
    expect(templateForView(tee, "left")).toBeNull();
  });
});

describe("groupMockupColors", () => {
  const index = templateSidesIndex([tee, plain]);

  it("puts every garment color of one design on one template on one card, in the job order", () => {
    const groups = groupMockupColors(
      groupMockupSides(
        [
          mockup("f1", FRONT, "FFFFFF"),
          mockup("b1", BACK, "FFFFFF"),
          mockup("f2", FRONT, "1F2A44"),
          mockup("o", OTHER, "FFFFFF"),
        ],
        index
      )
    );

    expect(groups.map((group) => group.colors.map((card) => card.sides.length))).toEqual([
      [2, 1],
      [1],
    ]);
    expect(colorGroupOfMockup(groups, "f2")).toBe(groups[0]);
  });

  it("keeps a mock-up without a slot on a card of its own", () => {
    const loose = { ...mockup("x", FRONT), slotKey: null } as MockupImage;

    expect(groupMockupColors(groupMockupSides([loose, mockup("f", FRONT)], index))).toHaveLength(2);
  });
});
