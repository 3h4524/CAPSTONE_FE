import { describe, expect, it } from "vitest";

import { productServerErrors } from "@/helpers/batch-product-errors";

const problem = (status: number, code: string, detail: string, errors?: Record<string, string[]>) => ({
  response: { status, data: { code, detail, title: detail, ...(errors ? { errors } : {}) } },
});

const blocked = (where: string) =>
  problem(400, "ContentPolicyViolation", `This content was blocked by the content policy because it appears to contain Hate${where}. Change it and try again.`);

describe("productServerErrors", () => {
  it.each([
    [" (in the product name)", "name"],
    [" (in the niche)", "niche"],
    [" (in the keywords)", "keywords"],
    [" (in the product description)", "productDescription"],
    [" (in the design text)", "designText"],
    [" (in the custom image prompt)", "customPrompt"],
  ])("marks the field a content-policy block names%s", (where, field) => {
    expect(productServerErrors(blocked(where))).toEqual([{ field, message: expect.stringContaining("blocked by the content policy") }]);
  });

  it("leaves a content-policy block that names no field to the form as a whole", () => {
    expect(productServerErrors(blocked(""))).toEqual([{ field: null, message: expect.stringContaining("blocked") }]);
  });

  it("marks the name of a product the batch already has", () => {
    expect(productServerErrors(problem(409, "Products.Duplicate", "A product with this name already exists in this batch.")))
      .toEqual([{ field: "name", message: "A product with this name already exists in this batch." }]);
  });

  it("marks the product type a batch of another line refuses", () => {
    const message = "This is a mugs batch: use Mug, or put this T-shirt in a batch of its own line.";
    expect(productServerErrors(problem(400, "Validation.General", message))).toEqual([{ field: "productType", message }]);
  });

  it("marks each field a validator names", () => {
    const error = problem(400, "Validation.General", "One or more validation errors occurred.", {
      CustomPrompt: ["Too long."],
      "Keywords[0]": ["Too short."],
      Unknown: ["Ignored."],
    });
    expect(productServerErrors(error)).toEqual([
      { field: "customPrompt", message: "Too long." },
      { field: "keywords", message: "Too short." },
    ]);
  });

  it("leaves any other failure to the form as a whole", () => {
    expect(productServerErrors(new Error("Network Error"))).toEqual([{ field: null, message: "Network Error" }]);
  });
});
