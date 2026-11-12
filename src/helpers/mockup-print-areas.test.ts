import { describe, expect, it } from "vitest";

import { spreadMockupChange } from "@/helpers/mockup-overrides";
import {
  areaFits,
  MAIN_AREA_KEY,
  normalizeRotation,
  parsePrintLayout,
  resolveMockupAreas,
  rotatedBounds,
  sameAreas,
  templateView,
  withViewTemplates,
} from "@/helpers/mockup-template";
import { buildMockupTemplate } from "@/test/factories";
import type { MockupArea, MockupImage } from "@/types/mockup-templates";

const main: MockupArea = { key: MAIN_AREA_KEY, name: "Chest", x: 800, y: 600, width: 900, height: 1100, rotation: 0, source: "same" };
const sleeve: MockupArea = { key: "sleeve-left", name: "Left sleeve", x: 300, y: 500, width: 200, height: 200, rotation: -15, source: "none" };

describe("print area layout", () => {
  it("reads a template of one rectangle, as every template had before, as one main area on the front", () => {
    expect(parsePrintLayout('{"x":820,"y":640,"width":900,"height":1100,"unit":"px"}')).toEqual({
      view: "front",
      areas: [{ key: MAIN_AREA_KEY, name: null, x: 820, y: 640, width: 900, height: 1100, rotation: 0, source: "same" }],
    });
  });

  it("reads the side of the garment and every area the server keeps, leaving out the ones it can't read", () => {
    const json = JSON.stringify({
      x: 800, y: 600, width: 900, height: 1100, unit: "px", name: "Chest", view: "back",
      areas: [
        { key: "sleeve-left", name: "Left sleeve", x: 300, y: 500, width: 200, height: 200, rotation: -15, source: "none" },
        { key: "Bad Key", x: 1, y: 1, width: 5, height: 5 },
        { key: "flat", x: 1, y: 1, width: 0, height: 5 },
      ],
    });

    expect(parsePrintLayout(json)).toEqual({ view: "back", areas: [main, sleeve] });
  });

  it("is nothing without a main area", () => {
    expect(parsePrintLayout('{"areas":[]}')).toBeNull();
    expect(parsePrintLayout("not json")).toBeNull();
  });
});

describe("turning a print area", () => {
  it("keeps the turn within half a circle either way, to a tenth of a degree", () => {
    expect(normalizeRotation(190)).toBe(-170);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(12.345)).toBe(12.3);
  });

  it("measures the box around a turned area as the server does", () => {
    expect(rotatedBounds({ x: 100, y: 200, width: 300, height: 300, rotation: 90 })).toEqual({ x: 100, y: 200, width: 300, height: 300 });
    expect(rotatedBounds({ x: 0, y: 0, width: 200, height: 100, rotation: 90 })).toEqual({ x: 50, y: -50, width: 100, height: 200 });
    expect(rotatedBounds({ x: 100, y: 200, width: 300, height: 300, rotation: 30 })).toEqual({ x: 45, y: 145, width: 410, height: 410 });
  });

  it("finds a turned area that reaches off the photo", () => {
    const corner = { x: 0, y: 0, width: 100, height: 100 };

    expect(areaFits({ ...corner, rotation: 0 }, 1000, 1000)).toBe(true);
    expect(areaFits({ ...corner, rotation: 45 }, 1000, 1000)).toBe(false);
    expect(areaFits({ ...corner, x: 100, y: 100, rotation: 45 }, 1000, 1000)).toBe(true);
  });
});

describe("a mock-up's own print areas", () => {
  const layout = { view: "front" as const, areas: [main, sleeve] };

  it("lays the mock-up's own settings over the template's, then the job's", () => {
    const own = [{ ...sleeve, x: 10, rotation: 5, source: "design" as const, designImageId: "logo" }];

    expect(resolveMockupAreas(layout, own, null)[1]).toMatchObject({ x: 10, rotation: 5, source: "design", designImageId: "logo", name: "Left sleeve" });
    expect(resolveMockupAreas(layout, null, null, { "sleeve-left": { kind: "same" } })[1].source).toBe("same");
    expect(resolveMockupAreas(layout, null, { x: 1, y: 2, width: 3, height: 4 })[0]).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("tells areas apart by place, turn and what they print", () => {
    expect(sameAreas([main, sleeve], [main, sleeve])).toBe(true);
    expect(sameAreas([main, sleeve], [main, { ...sleeve, rotation: 0 }])).toBe(false);
    expect(sameAreas([main, sleeve], [main, { ...sleeve, source: "same" }])).toBe(false);
    expect(sameAreas([main], [main, sleeve])).toBe(false);
  });

  it("copies the print areas to the other mock-ups on the same template", () => {
    const template = buildMockupTemplate({ id: "tee", printAreaConfig: JSON.stringify({ ...main, unit: "px", areas: [sleeve] }) });
    const other: MockupImage = {
      id: "other",
      productId: "p",
      designImageId: "d2",
      mockupTemplateId: "tee",
      mockupImageUrl: "https://cdn/o.jpg",
      mockupWidthPx: 2000,
      mockupHeightPx: 2000,
      approvalStatus: "pending",
      garmentColor: null,
      slotKey: "slot-2",
    };
    const areas = [main, { ...sleeve, source: "design" as const, designImageId: "logo" }];

    const spread = spreadMockupChange(
      { mockupTemplateId: "tee", garmentColor: null, backgroundColor: null, printArea: null, areas },
      [other],
      new Map([["tee", template]])
    );

    expect(spread).toEqual([
      {
        slotKey: "slot-2",
        replacedMockupImageId: "other",
        override: { mockupTemplateId: "tee", garmentColor: null, backgroundColor: null, printArea: null, areas },
      },
    ]);
  });
});

describe("photos of a template's other sides", () => {
  it("lists every template with its sides beside it, and tells which side each shows", () => {
    const back = buildMockupTemplate({ id: "tee-back", printAreaConfig: '{"x":0,"y":0,"width":10,"height":10,"view":"back"}' });
    const left = buildMockupTemplate({ id: "tee-left", printAreaConfig: '{"x":0,"y":0,"width":10,"height":10,"view":"left"}' });
    const tee = buildMockupTemplate({ id: "tee", printAreaConfig: '{"x":0,"y":0,"width":10,"height":10}', views: [back, left] });
    const mug = buildMockupTemplate({ id: "mug" });

    expect(withViewTemplates([tee, mug]).map((template) => template.id)).toEqual(["tee", "tee-back", "tee-left", "mug"]);
    expect([tee, back, left].map(templateView)).toEqual(["front", "back", "left"]);
  });
});
