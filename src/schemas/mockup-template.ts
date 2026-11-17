import { z } from "zod";

import { i18n } from "@/i18n/client";
import { productTypes } from "@/schemas/batches";

export const mockupTemplateSchema = z.object({
  name: z.string().trim().min(1, { error: () => i18n.t("mockups.schema.nameMin") }).max(120),
  productType: z.enum(productTypes),
  x: z.number({ error: () => i18n.t("mockups.schema.positionNumber") }).int().min(0, { error: () => i18n.t("mockups.schema.positionMin") }),
  y: z.number({ error: () => i18n.t("mockups.schema.positionNumber") }).int().min(0, { error: () => i18n.t("mockups.schema.positionMin") }),
  width: z.number({ error: () => i18n.t("mockups.schema.widthNumber") }).int().min(1, { error: () => i18n.t("mockups.schema.minOne") }),
  height: z.number({ error: () => i18n.t("mockups.schema.heightNumber") }).int().min(1, { error: () => i18n.t("mockups.schema.minOne") }),
});

export type MockupTemplateFormValues = z.infer<typeof mockupTemplateSchema>;
