import { z } from "zod";

import { i18n } from "@/i18n/client";

const CATEGORIES = [
  "sexual",
  "sexual_minors",
  "violence_gore",
  "hate",
  "self_harm",
  "illegal",
  "ip_trademark",
] as const;

export const moderationTermSchema = z.object({
  term: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.moderation.termMin") }).max(100, { error: () => i18n.t("admin.schemas.moderation.termMax") }),
  category: z.enum(CATEGORIES, { error: () => i18n.t("admin.schemas.moderation.categoryChoose") }),
  severity: z.enum(["block", "flag"]),
  matchUnaccented: z.boolean(),
  language: z.enum(["en", "vi"]),
  isActive: z.boolean(),
  note: z.string().trim().max(300, { error: () => i18n.t("admin.schemas.moderation.termNoteMax") }),
});

export type ModerationTermFormValues = z.infer<typeof moderationTermSchema>;

export const moderationAllowlistSchema = z.object({
  phrase: z.string().trim().min(1, { error: () => i18n.t("admin.schemas.moderation.phraseMin") }).max(200, { error: () => i18n.t("admin.schemas.moderation.phraseMax") }),
  isActive: z.boolean(),
  note: z.string().trim().max(300, { error: () => i18n.t("admin.schemas.moderation.termNoteMax") }),
});

export type ModerationAllowlistFormValues = z.infer<typeof moderationAllowlistSchema>;

// A term of several words can only ever match as a phrase; the backend applies the same rule.
export const matchTypeOf = (term: string) => (term.trim().includes(" ") ? "phrase" : "word");
