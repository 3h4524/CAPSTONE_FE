import { z } from "zod";

// BR195: usage limits must be >= 0, or exactly -1 to mean "unlimited".
const nonNegativeOrUnlimited = (label: string) =>
  z
    .number({ message: `Enter a number for ${label}.` })
    .refine((value) => value >= 0 || value === -1, `${label} must be 0 or greater, or -1 for unlimited.`);

export const subscriptionPlanFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a plan name.").max(100),
  // BR194: lowercase, no spaces, immutable after creation — only editable when creating.
  tier: z
    .string()
    .trim()
    .min(1, "Enter a tier slug.")
    .regex(/^[a-z0-9-]+$/, "Tier slug must be lowercase and contain no spaces."),
  description: z.string().trim().max(2000).optional(),
  monthlyPriceUsd: z.number({ message: "Enter a monthly price." }).min(0, "Monthly price must be 0 or greater."),
  annualPriceUsd: z.number().min(0, "Annual price must be 0 or greater.").optional(),
  maxBatchSize: nonNegativeOrUnlimited("Max batch size"),
  maxConcurrentJobs: nonNegativeOrUnlimited("Concurrent jobs"),
  maxProductsPerMonth: nonNegativeOrUnlimited("Products / month"),
  imageGenerationQuota: nonNegativeOrUnlimited("Images / month"),
  videoGenerationQuota: nonNegativeOrUnlimited("Videos / month"),
  apiCallQuota: nonNegativeOrUnlimited("API calls / month"),
  storageQuotaGb: nonNegativeOrUnlimited("Storage (GB)"),
  customApiKeysAllowed: z.boolean(),
  whiteLabelExportEnabled: z.boolean(),
  prioritySupport: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export type SubscriptionPlanFormValues = z.infer<typeof subscriptionPlanFormSchema>;

export const deletePlanFormSchema = z.object({
  reason: z.string().trim().min(1, "Enter a reason for deleting this plan.").max(500),
});

export type DeletePlanFormValues = z.infer<typeof deletePlanFormSchema>;
