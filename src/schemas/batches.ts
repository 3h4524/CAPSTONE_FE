import { z } from "zod";

import { i18n } from "@/i18n/client";

export const productTypes = ["tshirt", "hoodie", "mug", "poster", "tote_bag", "phone_case"] as const;
export const batchSchema = z.object({ name: z.string().trim().min(1, { error: () => i18n.t("batches.schema.enterBatchName") }).max(255), description: z.string().max(2000), defaultNiche: z.string().max(255), defaultProductType: z.enum(productTypes).or(z.literal("")).refine((value) => value.length > 0, { error: () => i18n.t("batches.schema.chooseBatchMakes") }) });
export const productSchema = z.object({
  name: z.string().trim().min(1, { error: () => i18n.t("batches.schema.enterProductName") }).max(255),
  productType: z.enum(productTypes),
  niche: z.string().trim().min(1, { error: () => i18n.t("batches.schema.enterNiche") }).max(255),
  keywords: z.string().refine((value) => value.split(",").map((item) => item.trim()).filter(Boolean).length > 0, { error: () => i18n.t("batches.schema.enterKeyword") }).refine((value) => value.split(",").map((item) => item.trim()).filter(Boolean).length <= 13, { error: () => i18n.t("batches.schema.maxKeywords") }),
  productDescription: z.string().max(2000, { error: () => i18n.t("batches.schema.maxProductDescription") }),
  sourceNotes: z.string().max(2000),
  designText: z.string().max(100, { error: () => i18n.t("batches.schema.designTextMax") }),
  customPrompt: z.string().max(1000, { error: () => i18n.t("batches.schema.customPromptMax") }),
});
export type BatchFormValues = z.infer<typeof batchSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
