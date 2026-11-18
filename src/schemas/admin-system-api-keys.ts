import { z } from "zod";

import { i18n } from "@/i18n/client";

export const addSystemApiKeySchema = z.object({
  provider: z.enum(["ideogram", "minimax"]),
  label: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.systemApiKeys.nameMin") }).max(100, { error: () => i18n.t("admin.schemas.systemApiKeys.nameMax") }),
  key: z.string().trim().min(8, { error: () => i18n.t("admin.schemas.systemApiKeys.keyMin") }).max(500, { error: () => i18n.t("admin.schemas.systemApiKeys.keyMax") }),
});

export type AddSystemApiKeyFormValues = z.infer<typeof addSystemApiKeySchema>;

// An empty box means no limit; the fields hold text so a cleared box stays empty.
const optionalWholeNumber = (min: number, max: number, messageKey: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max), { error: () => i18n.t(messageKey) });

export const systemApiKeyProviderSchema = z.object({
  dailyLimitPerKey: optionalWholeNumber(0, 1_000_000, "admin.schemas.systemApiKeys.dailyLimit"),
  maxConcurrentPerKey: optionalWholeNumber(1, 1_000, "admin.schemas.systemApiKeys.concurrentLimit"),
  strategy: z.enum(["fill", "rotate"]),
});

export type SystemApiKeyProviderFormValues = z.infer<typeof systemApiKeyProviderSchema>;

/** The form's text back to a limit: null for an empty box. */
export const toLimit = (value: string): number | null => (value.trim() === "" ? null : Number(value));
