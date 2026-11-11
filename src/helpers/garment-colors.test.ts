import { describe, expect, it } from "vitest";

import { carryColors, garmentColorName, printifyStartColors } from "@/helpers/garment-colors";

const PRINTIFY_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#232424" },
  { name: "Navy", hex: "#252A3F" },
];

describe("garmentColorName", () => {
  it("names a color from the palette shown, else gives its hex", () => {
    expect(garmentColorName("#252a3f", PRINTIFY_COLORS)).toBe("Navy");
    expect(garmentColorName("#1f2a44")).toBe("Navy");
    expect(garmentColorName("#123456", PRINTIFY_COLORS)).toBe("#123456");
  });
});

describe("printifyStartColors", () => {
  it("starts with the template's own color when Printify makes it", () => {
    expect(printifyStartColors({ garmentColor: "#232424", printify: { colors: PRINTIFY_COLORS } })).toEqual(["#232424"]);
  });

  it("starts with White, else the first color, when Printify does not make the template's own", () => {
    expect(printifyStartColors({ garmentColor: "#1F2A44", printify: { colors: PRINTIFY_COLORS } })).toEqual(["#FFFFFF"]);
    expect(printifyStartColors({ garmentColor: null, printify: { colors: PRINTIFY_COLORS.slice(1) } })).toEqual(["#232424"]);
  });

  it("has nothing to start with for a template without Printify colors", () => {
    expect(printifyStartColors({ garmentColor: "#FFFFFF", printify: null })).toEqual([]);
  });
});

describe("carryColors", () => {
  const bella3001 = [
    { name: "Mauve", hex: "#C97B7C" },
    { name: "Military Green", hex: "#545C46" },
    { name: "Forest", hex: "#2A3F37" },
  ];
  const bella3001u = [
    { name: "White", hex: "#FFFFFF" },
    { name: "Mauve", hex: "#CE7C7C" },
    { name: "Military Green", hex: "#565E47" },
  ];

  it("takes each color over by name to the other blueprint's hex", () => {
    expect(carryColors(["#C97B7C", "#545C46"], bella3001, bella3001u)).toEqual([
      { from: "#C97B7C", to: "#CE7C7C" },
      { from: "#545C46", to: "#565E47" },
    ]);
  });

  it("drops a color the other blueprint has no name for", () => {
    expect(carryColors(["#2A3F37", "#C97B7C"], bella3001, bella3001u)).toEqual([{ from: "#C97B7C", to: "#CE7C7C" }]);
  });

  it("names a color from the fixed suggestions when it came from a template not linked to Printify", () => {
    expect(carryColors(["#FFFFFF", "#123456"], undefined, bella3001u)).toEqual([{ from: "#FFFFFF", to: "#FFFFFF" }]);
  });
});
