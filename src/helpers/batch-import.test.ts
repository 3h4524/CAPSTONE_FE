import { describe, expect, it } from "vitest";

import { parseProductSheet } from "@/helpers/batch-import";

const HEADERS = ["Product name", "Product type", "Niche", "Keywords"];

const rowsOf = (result: ReturnType<typeof parseProductSheet>) => {
  if ("error" in result) throw new Error(result.error);
  return result.rows;
};

describe("parseProductSheet", () => {
  it("reads a valid row", () => {
    const [row] = rowsOf(parseProductSheet([HEADERS, ["Retro Surf", "T-shirt", "Surfers", "Surf, Sunset"]]));

    expect(row?.row).toBe(2);
    expect(row?.product).toMatchObject({ name: "Retro Surf", productType: "tshirt", niche: "Surfers", keywords: ["surf", "sunset"] });
    expect(row?.issues).toEqual([]);
  });

  it("accepts the other spellings of a product type", () => {
    const [row] = rowsOf(parseProductSheet([HEADERS, ["Bag", "Tote Bag", "Shoppers", "bag"]]));

    expect(row?.product.productType).toBe("tote_bag");
  });

  it("keeps an invalid row and says what is wrong", () => {
    const [row] = rowsOf(parseProductSheet([HEADERS, ["", "T-shirt", "Surfers", "surf"]]));

    expect(row?.issues.length).toBeGreaterThan(0);
  });

  it("skips rows that are entirely empty", () => {
    const rows = rowsOf(parseProductSheet([HEADERS, ["Retro Surf", "T-shirt", "Surfers", "surf"], ["", "", "", ""]]));

    expect(rows).toHaveLength(1);
  });

  it("refuses a sheet without the required columns", () => {
    expect(parseProductSheet([["Product name", "Niche"], ["Retro Surf", "Surfers"]])).toEqual({
      error: "The Products worksheet must include Product name, Product type, Niche and Keywords columns.",
    });
  });

  it("refuses more rows than one import allows", () => {
    const rows = Array.from({ length: 501 }, () => ["Retro Surf", "T-shirt", "Surfers", "surf"]);

    expect(parseProductSheet([HEADERS, ...rows])).toEqual({ error: "A file can contain up to 500 product rows per import." });
  });

  it("refuses a sheet with no products", () => {
    expect(parseProductSheet([HEADERS])).toEqual({
      error: "No product rows found. Use the Products worksheet and keep the provided column headers.",
    });
  });
});
