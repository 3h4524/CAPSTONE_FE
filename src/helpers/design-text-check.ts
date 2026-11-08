import type { DesignTextCheck } from "@/types/batch-jobs";

export type DesignTextCheckSummary = {
  tone: "ok" | "warning";
  label: string;
  /** What was wrong, in words; empty when nothing was. */
  detail: string;
  /** What OCR read, for a tooltip. */
  read: string;
};

const list = (words: string[]) => words.join(", ");

/**
 * The note shown under a design for its OCR text check, or null when there is nothing to show: no check, or a design
 * that prints no words and has none.
 */
export const summarizeTextCheck = (check: DesignTextCheck | null | undefined): DesignTextCheckSummary | null => {
  if (!check) return null;
  const read = check.read ? `OCR read: ${check.read}` : "OCR read no text";

  if (check.expected === null) {
    return check.ok ? null : { tone: "warning", label: "Unexpected text", detail: list(check.extra), read };
  }
  if (check.ok) return { tone: "ok", label: "Text matches", detail: "", read };

  const parts = [
    check.missing.length > 0 && `missing ${list(check.missing)}`,
    check.extra.length > 0 && `extra ${list(check.extra)}`,
    check.repeated.length > 0 && `repeated ${list(check.repeated)}`,
  ].filter((part): part is string => Boolean(part));
  return { tone: "warning", label: "Text may be wrong", detail: parts.join("; "), read };
};
