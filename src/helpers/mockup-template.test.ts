import { describe, expect, it } from "vitest";

import {
  isAutomaticPlacement,
  isRectangleQuad,
  isValidQuad,
  keepInFrame,
  MAX_MOCKUP_SELECTION,
  parsePrintifyFrame,
  parsePrintQuad,
  printifySelectionIssue,
  type PrintQuad,
  quadBounds,
  quadFromArea,
  sortMockupList,
  uncoveredProductTypes,
  withTemplatePlacement,
} from "@/helpers/mockup-template";
import { buildMockupTemplate } from "@/test/factories";

describe("print area corners", () => {
  const trapezoid: PrintQuad = [
    { x: 400, y: 500 },
    { x: 700, y: 520 },
    { x: 690, y: 900 },
    { x: 410, y: 880 },
  ];

  it("reads the corners the server keeps, and nothing for a rectangle", () => {
    const json = '{"x":400,"y":500,"width":300,"height":400,"unit":"px","quad":[[400,500],[700,520],[690,900],[410,880]]}';

    expect(parsePrintQuad(json)).toEqual(trapezoid);
    expect(parsePrintQuad('{"x":1,"y":2,"width":3,"height":4}')).toBeNull();
    expect(parsePrintQuad('{"quad":[[1,2],[3,4]]}')).toBeNull();
  });

  it("turns a rectangle into corners and corners into the box around them", () => {
    const quad = quadFromArea({ x: 10, y: 20, width: 30, height: 40 });

    expect(isRectangleQuad(quad)).toBe(true);
    expect(quadBounds(quad)).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    expect(isRectangleQuad(trapezoid)).toBe(false);
    expect(quadBounds(trapezoid)).toEqual({ x: 400, y: 500, width: 300, height: 400 });
  });

  it("accepts corners going clockwise inside the photo only", () => {
    expect(isValidQuad(trapezoid, 1000, 1500)).toBe(true);
    expect(isValidQuad([trapezoid[0], trapezoid[2], trapezoid[1], trapezoid[3]], 1000, 1500)).toBe(false);
    expect(isValidQuad([trapezoid[0], trapezoid[3], trapezoid[2], trapezoid[1]], 1000, 1500)).toBe(false);
    expect(isValidQuad(trapezoid, 650, 1500)).toBe(false);
  });
});

describe("isAutomaticPlacement", () => {
  it("reads the automatic mark of a model photo's print area", () => {
    expect(isAutomaticPlacement('{"x":1,"y":2,"width":3,"height":4,"unit":"px","auto":true}')).toBe(true);
    expect(isAutomaticPlacement('{"x":1,"y":2,"width":3,"height":4,"unit":"px"}')).toBe(false);
    expect(isAutomaticPlacement('{"auto":"true"}')).toBe(false);
    expect(isAutomaticPlacement("not json")).toBe(false);
  });
});

describe("printifySelectionIssue", () => {
  const printify = { blueprintId: 1, blueprintTitle: "Tee", printProviderId: 1, printProviderTitle: "Provider", defaultSizes: [], colors: [] };

  it("accepts one linked template for each product type", () => {
    expect(printifySelectionIssue([{ productType: "tshirt", printify }, { productType: "hoodie", printify }])).toBeNull();
  });

  it("names what is wrong with the choice", () => {
    expect(printifySelectionIssue([])).toBe("none");
    expect(printifySelectionIssue([{ productType: "tshirt", printify: null }])).toBe("notLinked");
    expect(printifySelectionIssue([{ productType: "tshirt", printify }, { productType: "TShirt", printify }])).toBe("sameType");
  });
});

describe("withTemplatePlacement", () => {
  const main = { key: "main", name: null, x: 10, y: 20, width: 30, height: 40, rotation: 0, source: "same" as const };
  const sleeve = { ...main, key: "sleeve", source: "none" as const };

  it("moves the main area only, and nothing without a position", () => {
    const layout = { view: "front" as const, areas: [main, sleeve] };

    expect(withTemplatePlacement(layout, { x: 1, y: 2, width: 3, height: 4, rotation: 15 }).areas).toEqual([
      { ...main, x: 1, y: 2, width: 3, height: 4, rotation: 15 },
      sleeve,
    ]);
    expect(withTemplatePlacement(layout, null)).toBe(layout);
  });
});

describe("uncoveredProductTypes", () => {
  it("lists the product types no chosen template is for", () => {
    expect(uncoveredProductTypes(["tshirt", "hoodie"], [{ productType: "TShirt" }])).toEqual(["hoodie"]);
    expect(uncoveredProductTypes(["tshirt", "hoodie"], [{ productType: "tshirt" }, { productType: "hoodie" }])).toEqual([]);
  });
});

describe("MAX_MOCKUP_SELECTION", () => {
  it("matches the apply-mockup schema limit", () => {
    expect(MAX_MOCKUP_SELECTION).toBe(5);
  });
});

describe("sortMockupList", () => {
  it("orders by usage count descending", () => {
    const templates = [
      buildMockupTemplate({ id: "low", name: "Low", usageCount: 2 }),
      buildMockupTemplate({ id: "high", name: "High", usageCount: 40 }),
      buildMockupTemplate({ id: "mid", name: "Mid", usageCount: 11 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("breaks a usage count tie by name ascending", () => {
    const templates = [
      buildMockupTemplate({ id: "c", name: "Tote bag", usageCount: 3 }),
      buildMockupTemplate({ id: "a", name: "Ceramic mug", usageCount: 3 }),
      buildMockupTemplate({ id: "b", name: "Poster", usageCount: 3 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the original order for fully equal entries", () => {
    const templates = [
      buildMockupTemplate({ id: "first", name: "Same", usageCount: 3 }),
      buildMockupTemplate({ id: "second", name: "Same", usageCount: 3 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["first", "second"]);
  });

  it("does not mutate the input list", () => {
    const templates = [
      buildMockupTemplate({ id: "low", name: "Low", usageCount: 2 }),
      buildMockupTemplate({ id: "high", name: "High", usageCount: 40 }),
    ];

    sortMockupList(templates);

    expect(templates.map((template) => template.id)).toEqual(["low", "high"]);
  });

  it("returns an empty array for an empty list", () => {
    expect(sortMockupList([])).toEqual([]);
  });

  it("sorts a single element list unchanged", () => {
    const templates = [buildMockupTemplate({ id: "only", usageCount: 0 })];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["only"]);
  });
});

describe("parsePrintifyFrame", () => {
  it("is the frame stored, or the main area of a Printify template whose design was never moved", () => {
  const frame = { x: 500, y: 500, width: 400, height: 400 };
    expect(parsePrintifyFrame(JSON.stringify({ x: 550, y: 520, width: 200, height: 150, printifyFrame: frame }))).toEqual(frame);
    expect(parsePrintifyFrame(JSON.stringify(frame))).toEqual(frame);
    expect(parsePrintifyFrame("not json")).toBeNull();
  });
});

describe("keepInFrame", () => {
  // A Printify print area on the photo.
  const frame = { x: 500, y: 500, width: 400, height: 400 };

  it("leaves a design that is already inside where it is", () => {
    expect(keepInFrame({ x: 550, y: 600, width: 200, height: 150 }, 0, frame)).toEqual({ x: 550, y: 600, width: 200, height: 150 });
  });

  it("moves a design past an edge back inside, keeping its size", () => {
    expect(keepInFrame({ x: 800, y: 450, width: 200, height: 200 }, 0, frame)).toEqual({ x: 700, y: 500, width: 200, height: 200 });
  });

  it("moves a turned design in by the corners it turns out", () => {
    // 200 x 200 turned 45° spans about 283 px each way.
    const kept = keepInFrame({ x: 500, y: 500, width: 200, height: 200 }, 45, frame);
    expect(kept).not.toBeNull();
    expect(kept!.x).toBeGreaterThan(500);
    expect(kept!.y).toBeGreaterThan(500);
    expect(kept!.width).toBe(200);
  });

  it("refuses a design too big for the frame", () => {
    expect(keepInFrame({ x: 500, y: 500, width: 400, height: 400 }, 30, frame)).toBeNull();
    expect(keepInFrame({ x: 400, y: 500, width: 500, height: 100 }, 0, frame)).toBeNull();
  });
});
