import { z } from "zod";

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
  term: z.string().trim().min(1, "Enter a word or phrase.").max(100, "Keep the term under 100 characters."),
  category: z.enum(CATEGORIES, { message: "Choose a category." }),
  severity: z.enum(["block", "flag"]),
  matchUnaccented: z.boolean(),
  language: z.enum(["en", "vi"]),
  isActive: z.boolean(),
  note: z.string().trim().max(300, "Keep the note under 300 characters."),
});

export type ModerationTermFormValues = z.infer<typeof moderationTermSchema>;

export const moderationAllowlistSchema = z.object({
  phrase: z.string().trim().min(1, "Enter a phrase.").max(200, "Keep the phrase under 200 characters."),
  isActive: z.boolean(),
  note: z.string().trim().max(300, "Keep the note under 300 characters."),
});

export type ModerationAllowlistFormValues = z.infer<typeof moderationAllowlistSchema>;

// A term of several words can only ever match as a phrase; the backend applies the same rule.
export const matchTypeOf = (term: string) => (term.trim().includes(" ") ? "phrase" : "word");
