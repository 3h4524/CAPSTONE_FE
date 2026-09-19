import { z } from "zod";

export const MOCKUP_PRODUCT_TYPES = ["tshirt", "hoodie", "mug", "poster", "tote_bag", "phone_case"] as const;

const isJsonObject = (value: string) => {
  try {
    return typeof JSON.parse(value) === "object" && JSON.parse(value) !== null && !Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
};

export const mockupTemplateSchema = z.object({
  name: z.string().trim().min(2, "Give the template a name (at least 2 characters).").max(120),
  productType: z.enum(MOCKUP_PRODUCT_TYPES, "Select a product type."),
  printAreaConfig: z.string().trim().refine(isJsonObject, "Enter the print area as a JSON object."),
  outputWidthPx: z.number({ error: "Enter a width between 100 and 10000." }).int().min(100).max(10000),
  outputHeightPx: z.number({ error: "Enter a height between 100 and 10000." }).int().min(100).max(10000),
});

export type MockupTemplateFormValues = z.infer<typeof mockupTemplateSchema>;
