import { z } from "zod";

import { i18n } from "@/i18n/client";

export const stylePresetSchema = z.object({
  name: z.string().trim().min(2, { error: () => i18n.t("styles.schema.nameMin") }).max(120),
  description: z.string().trim().min(10, { error: () => i18n.t("styles.schema.descriptionMin") }).max(2000),
  styleModifiers: z.string().trim().min(3, { error: () => i18n.t("styles.schema.modifiersMin") }).max(500),
  recommendationsText: z.string().max(500, { error: () => i18n.t("styles.schema.recommendationsMax") }),
});

export type StylePresetFormValues = z.infer<typeof stylePresetSchema>;
