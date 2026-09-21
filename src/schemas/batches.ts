import { z } from "zod";

export const productTypes = ["tshirt", "hoodie", "mug", "poster", "tote_bag", "phone_case"] as const;
export const batchSchema = z.object({ name: z.string().trim().min(1, "Enter a batch name.").max(255), description: z.string().max(2000), defaultNiche: z.string().max(255), defaultProductType: z.enum(productTypes).or(z.literal("")) });
export const productSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(255),
  productType: z.enum(productTypes),
  niche: z.string().trim().min(1, "Enter a niche.").max(255),
  keywords: z.string().refine((value) => value.split(",").map((item) => item.trim()).filter(Boolean).length > 0, "Enter at least one keyword.").refine((value) => value.split(",").map((item) => item.trim()).filter(Boolean).length <= 13, "Use no more than 13 keywords."),
  productDescription: z.string().max(2000, "Use no more than 2,000 characters."),
  sourceNotes: z.string().max(2000),
});
export type BatchFormValues = z.infer<typeof batchSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
