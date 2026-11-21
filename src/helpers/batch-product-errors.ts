import { getErrorMessage } from "@/helpers/error-message";
import type { ProductFormValues } from "@/schemas/batches";

export type ProductFormField = keyof ProductFormValues;
export type ProductServerError = { field: ProductFormField | null; message: string };

type ProblemResponse = { response?: { data?: { code?: unknown; errors?: unknown } } };

// The content check names the field it found the problem in as the backend's ModerationTexts.Product labels it
// ("the niche", "the custom image prompt", ...), in a message ending "(in the niche). Change it and try again.".
// Longer names first, so "product description" is not read as "product name".
const MODERATION_FIELDS: [RegExp, ProductFormField][] = [
  [/product description|description/i, "productDescription"],
  [/custom image prompt|image prompt|custom prompt/i, "customPrompt"],
  [/design text/i, "designText"],
  [/keyword/i, "keywords"],
  [/niche/i, "niche"],
  [/product name|\bname\b/i, "name"],
];

const FORM_FIELDS: ProductFormField[] = ["name", "productType", "niche", "keywords", "productDescription", "sourceNotes", "designText", "customPrompt"];

// A validator key ("CustomPrompt", "Keywords[0]") to the form field it belongs to.
const fieldOfKey = (key: string): ProductFormField | null => {
  const base = key.replace(/\[\d+\]$/, "").split(".").at(-1)?.toLowerCase() ?? "";
  return FORM_FIELDS.find((field) => field.toLowerCase() === base) ?? null;
};

const moderationField = (message: string): ProductFormField | null => {
  const where = /\(in ([^)]+)\)/i.exec(message)?.[1];
  if (!where) return null;
  return MODERATION_FIELDS.find(([pattern]) => pattern.test(where))?.[1] ?? null;
};

/** Which fields of the product form a failed save was about, so the form can mark them; null for the form as a whole. */
export const productServerErrors = (error: unknown): ProductServerError[] => {
  const message = getErrorMessage(error);
  const data = (error as ProblemResponse | null)?.response?.data;
  const code = typeof data?.code === "string" ? data.code : null;

  if (data?.errors && typeof data.errors === "object") {
    const byField = Object.entries(data.errors as Record<string, unknown>).flatMap(([key, messages]) => {
      const field = fieldOfKey(key);
      const first = Array.isArray(messages) ? messages.find((item) => typeof item === "string") : null;
      return field && first ? [{ field, message: first as string }] : [];
    });
    if (byField.length > 0) return byField;
  }
  if (code === "ContentPolicyViolation") return [{ field: moderationField(message), message }];
  if (code === "Products.Duplicate") return [{ field: "name", message }];
  // The batch makes another product line (BatchService.CheckLine): "This is a mugs batch: use Mug, or put ...".
  if (/^This is an? .+ batch: use /i.test(message)) return [{ field: "productType", message }];
  return [{ field: null, message }];
};
