import { z } from "zod";

import { i18n } from "@/i18n/client";

// Matches UpdateFeatureRequestDtoValidator and the features columns on the backend.
export const featureFormSchema = z.object({
  label: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.featureCatalog.labelMin") }).max(120, { error: () => i18n.t("admin.schemas.featureCatalog.labelMax") }),
  description: z.string().trim().max(500, { error: () => i18n.t("admin.schemas.featureCatalog.descriptionMax") }),
  group: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.featureCatalog.groupMin") }).max(60, { error: () => i18n.t("admin.schemas.featureCatalog.groupMax") }),
  unit: z.string().trim().max(40, { error: () => i18n.t("admin.schemas.featureCatalog.unitMax") }),
  // Empty means no limit.
  defaultLimit: z
    .number({ error: () => i18n.t("admin.schemas.featureCatalog.enterOrEmpty") })
    .int({ error: () => i18n.t("admin.schemas.featureCatalog.wholeNumber") })
    .min(0, { error: () => i18n.t("admin.schemas.featureCatalog.defaultMin") })
    .max(10_000, { error: () => i18n.t("admin.schemas.featureCatalog.defaultMax") })
    .nullable(),
  sortOrder: z
    .number({ error: () => i18n.t("admin.schemas.featureCatalog.positionNumber") })
    .int({ error: () => i18n.t("admin.schemas.featureCatalog.wholeNumber") })
    .min(0, { error: () => i18n.t("admin.schemas.featureCatalog.positionMin") })
    .max(10_000, { error: () => i18n.t("admin.schemas.featureCatalog.positionMax") }),
  trialAvailable: z.boolean(),
  isActive: z.boolean(),
});

export type FeatureFormValues = z.infer<typeof featureFormSchema>;
