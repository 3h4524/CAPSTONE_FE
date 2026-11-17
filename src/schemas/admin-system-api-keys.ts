import { z } from "zod";

export const addSystemApiKeySchema = z.object({
  provider: z.enum(["ideogram", "minimax"]),
  label: z.string().trim().min(1, "Name the key, such as the account it belongs to.").max(100, "Keep the name under 100 characters."),
  key: z.string().trim().min(8, "Paste the whole key.").max(500, "This is longer than any key."),
});

export type AddSystemApiKeyFormValues = z.infer<typeof addSystemApiKeySchema>;

// An empty box means no limit; the fields hold text so a cleared box stays empty.
const optionalWholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max), message);

export const systemApiKeyProviderSchema = z.object({
  dailyLimitPerKey: optionalWholeNumber(0, 1_000_000, "Enter a whole number from 0 to 1,000,000, or leave it empty for no limit."),
  maxConcurrentPerKey: optionalWholeNumber(1, 1_000, "Enter a whole number from 1 to 1,000, or leave it empty for no limit."),
  strategy: z.enum(["fill", "rotate"]),
});

export type SystemApiKeyProviderFormValues = z.infer<typeof systemApiKeyProviderSchema>;

/** The form's text back to a limit: null for an empty box. */
export const toLimit = (value: string): number | null => (value.trim() === "" ? null : Number(value));
