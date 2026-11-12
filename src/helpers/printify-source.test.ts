import { describe, expect, it } from "vitest";

import {
  blueprintOfTemplates,
  colorDistance,
  matchPrintifyColor,
  printifySetupProblem,
  readPrintifyProducts,
  templateColorsOf,
} from "@/helpers/printify-source";
import { nodeConfigSchemaIn } from "@/schemas/workflow";
import type { MockupTemplate } from "@/types/mockup-templates";

const template = (id: string, blueprintId: number | null, garmentColor: string | null = null) =>
  ({
    id,
    garmentColor,
    printify: blueprintId
      ? { blueprintId, blueprintTitle: `Blueprint ${blueprintId}`, blueprintImageUrl: null, printProviderId: 99, printProviderTitle: "Monster", defaultSizes: ["S"] }
      : null,
  }) as MockupTemplate;

const shirt = { blueprintId: 12, blueprintTitle: "Unisex Jersey Short Sleeve Tee", printProviderId: 99, printProviderTitle: "Monster Digital", colors: ["Black"], sizes: ["S", "M"], position: "front" };

describe("printify source", () => {
  it("reads the Printify product per product type in lowercase", () => {
    expect(Object.keys(readPrintifyProducts({ printifyProducts: { TShirt: shirt } }))).toEqual(["tshirt"]);
  });

  it("says what a product setup is missing", () => {
    expect(printifySetupProblem({ ...shirt, blueprintId: null })).toBe("choose a system template linked to Printify");
    expect(printifySetupProblem({ ...shirt, colors: [] })).toBe("no template color matches a color this provider prints");
    expect(printifySetupProblem(shirt)).toBeNull();
  });

  it("takes the Printify product from the chosen templates, which must show the same one", () => {
    expect(blueprintOfTemplates([template("a", 12), template("b", 12)]).blueprint?.id).toBe(12);
    expect(blueprintOfTemplates([template("a", 12), template("b", 6)]).problem).toContain("different Printify products");
    expect(blueprintOfTemplates([template("a", 12), template("b", null)]).problem).toContain("not linked");
  });

  it("measures colors the way they look", () => {
    expect(colorDistance("#FFFFFF", "#FFFFFF")).toBe(0);
    expect(colorDistance("#1F2A44", "#3B4A6B")).toBeLessThan(colorDistance("#1F2A44", "#B22222"));
  });

  it("sells a template color as the closest provider color, or not at all when none is close", () => {
    expect(matchPrintifyColor("#1F2A44", ["White", "Navy", "Heather Navy"]).name).toBe("Navy");
    expect(matchPrintifyColor("#5C1F2A", ["White", "Black", "Navy"]).name).toBeNull();
    expect(matchPrintifyColor("#FFFFFF", ["Galaxy Swirl"])).toEqual({ hex: "#FFFFFF", name: null, distance: null });
  });

  it("uses each template's chosen colors, else its own color", () => {
    expect(templateColorsOf([template("a", 12, "#ffffff"), template("b", 12)], { b: ["#1a1a1a", "#1F2A44"] })).toEqual(["#FFFFFF", "#1A1A1A", "#1F2A44"]);
  });

  it("lets Push to Printify follow Apply mock-up instead of choosing its own product", () => {
    const publish = { blueprintId: null, blueprintTitle: null, printProviderId: null, printProviderTitle: null, colors: [], sizes: [], targetProfit: 10, designId: null, publishToEtsy: true, addMockups: true };
    const mockup = { data: { type: "apply-mockup" as const, config: { printifyProducts: { tshirt: shirt } } } };

    expect(nodeConfigSchemaIn("publish-printify", []).safeParse(publish).success).toBe(false);
    expect(nodeConfigSchemaIn("publish-printify", [mockup]).safeParse(publish).success).toBe(true);
    expect(nodeConfigSchemaIn("publish-printify", [mockup]).safeParse({ ...publish, targetProfit: 900 }).success).toBe(false);
  });
});
