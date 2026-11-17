import { z } from "zod";

import { i18n } from "@/i18n/client";

const limitLabel = (labelKey: string) => i18n.t(`admin.schemas.subscriptionPlan.limits.${labelKey}`);

// BR195: usage limits must be >= 0, or exactly -1 to mean "unlimited".
const nonNegativeOrUnlimited = (labelKey: string) =>
  z
    .number({ error: () => i18n.t("admin.schemas.subscriptionPlan.enterNumber", { label: limitLabel(labelKey) }) })
    .refine((value) => value >= 0 || value === -1, {
      error: () => i18n.t("admin.schemas.subscriptionPlan.mustBeZeroOrUnlimited", { label: limitLabel(labelKey) }),
    });

export const subscriptionPlanFormSchema = z.object({
  name: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.subscriptionPlan.planName") }).max(100),
  // BR194: lowercase, no spaces, immutable after creation — only editable when creating.
  tier: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t("admin.schemas.subscriptionPlan.tierRequired") })
    .regex(/^[a-z0-9-]+$/, { error: () => i18n.t("admin.schemas.subscriptionPlan.tierSlugFormat") }),
  description: z.string().trim().max(2000).optional(),
  monthlyPriceUsd: z.number({ error: () => i18n.t("admin.schemas.subscriptionPlan.monthlyPrice") }).min(0, { error: () => i18n.t("admin.schemas.subscriptionPlan.monthlyPriceMin") }),
  annualPriceUsd: z.number().min(0, { error: () => i18n.t("admin.schemas.subscriptionPlan.annualPriceMin") }).optional(),
  // Only set when the Admin prices in VND; kept out of the USD branch, where they stay undefined.
  monthlyPriceVnd: z.number().min(0, { error: () => i18n.t("admin.schemas.subscriptionPlan.monthlyPriceMin") }).optional(),
  annualPriceVnd: z.number().min(0, { error: () => i18n.t("admin.schemas.subscriptionPlan.annualPriceMin") }).optional(),
  maxBatchSize: nonNegativeOrUnlimited("maxBatchSize"),
  maxConcurrentJobs: nonNegativeOrUnlimited("concurrentJobs"),
  maxProductsPerMonth: nonNegativeOrUnlimited("productsPerMonth"),
  imageGenerationQuota: nonNegativeOrUnlimited("imagesPerMonth"),
  videoGenerationQuota: nonNegativeOrUnlimited("videosPerMonth"),
  apiCallQuota: nonNegativeOrUnlimited("apiCallsPerMonth"),
  storageQuotaGb: nonNegativeOrUnlimited("storageQuotaGb"),
  customApiKeysAllowed: z.boolean(),
  whiteLabelExportEnabled: z.boolean(),
  prioritySupport: z.boolean(),
  isActive: z.boolean(),
  // Keyed by feature code. A limit of null means no limit. Left out, the plan keeps its features.
  features: z.record(
    z.string(),
    z.object({
      isEnabled: z.boolean(),
      limitValue: z
        .number({ error: () => i18n.t("admin.schemas.subscriptionPlan.limitEnterOrEmpty") })
        .int({ error: () => i18n.t("admin.schemas.subscriptionPlan.limitWhole") })
        .min(0, { error: () => i18n.t("admin.schemas.subscriptionPlan.limitZeroOrMore") })
        .nullable(),
    })
  ).optional(),
});

export type SubscriptionPlanFormValues = z.infer<typeof subscriptionPlanFormSchema>;

export const deletePlanFormSchema = z.object({
  reason: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.subscriptionPlan.deleteReason") }).max(500),
});

export type DeletePlanFormValues = z.infer<typeof deletePlanFormSchema>;
