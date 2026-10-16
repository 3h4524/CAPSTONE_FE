import { z } from "zod";

import { productTypes } from "@/schemas/batches";

export const mockupTemplateSchema = z.object({
  name: z.string().trim().min(1, "Enter a template name.").max(120),
  productType: z.enum(productTypes),
  x: z.number({ message: "Enter a position." }).int().min(0, "Must be 0 or more."),
  y: z.number({ message: "Enter a position." }).int().min(0, "Must be 0 or more."),
  width: z.number({ message: "Enter a width." }).int().min(1, "Must be at least 1."),
  height: z.number({ message: "Enter a height." }).int().min(1, "Must be at least 1."),
});

export type MockupTemplateFormValues = z.infer<typeof mockupTemplateSchema>;
