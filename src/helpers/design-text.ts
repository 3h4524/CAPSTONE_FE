import type { Product } from "@/types/batches";

// The same test the server makes: a template that quotes "{subject}" prints it as an exact phrase.
const QUOTED_SUBJECT = /"\{\{?\s*subject\s*\}\}?"/i;

/** True when the template prints the subject as an exact phrase, as typography templates do. */
export const printsExactPhrase = (basePrompt: string | null | undefined) =>
  !!basePrompt && QUOTED_SUBJECT.test(basePrompt);

const wordCount = (text: string | null | undefined) =>
  (text ?? "").split(/\s+/).filter(Boolean).length;

// Text in quotes, straight or curly: what a Seller usually means as words to print.
const QUOTED_TEXT = /["“”]([^"“”]+)["“”]/g;

// Prints on these have no background of their own (the server leaves it transparent or cuts it out).
const BACKGROUNDLESS_TYPES = new Set(["tshirt", "hoodie", "tote_bag"]);
const BACKGROUND_WORDS = /\b(background|backdrop|wallpaper)\b/i;

/**
 * Warnings for a product's own image prompt that asks for what the server will not do: words to print that are not the
 * design text (the server takes them out of the prompt), or a background on a print that has none. The Seller sees this
 * before the design is made.
 */
export const customPromptWarnings = (
  customPrompt: string | null | undefined,
  designText: string | null | undefined,
  productType?: string
): string[] => {
  const prompt = customPrompt?.trim() ?? "";
  if (!prompt) return [];

  const warnings: string[] = [];
  const words = designText?.trim() ?? "";
  const quoted = [...prompt.matchAll(QUOTED_TEXT)].map((match) => match[1].trim()).filter(Boolean);
  if (quoted.length > 0 && !words)
    warnings.push("Words in quotes are not printed. Put the words to print in Design text.");
  else if (quoted.some((text) => text.toLowerCase() !== words.toLowerCase()))
    warnings.push("Only the Design text is printed; other words in quotes are left out.");
  if (productType && BACKGROUNDLESS_TYPES.has(productType) && BACKGROUND_WORDS.test(prompt))
    warnings.push(
      "T-shirt, hoodie and tote bag prints have no background: a background you describe may be drawn into the artwork itself. Describe it as part of the scene instead."
    );
  return warnings;
};

// The server's threshold for a product's own image prompt that says too little (ArtworkPromptRules).
const THIN_CUSTOM_PROMPT_WORDS = 8;

// Whether a product says too little to design from: by its own image prompt when it has one, else by its keywords and description.
const isThin = (product: Pick<Product, "keywords" | "productDescription" | "customPrompt">) =>
  product.customPrompt?.trim()
    ? wordCount(product.customPrompt) < THIN_CUSTOM_PROMPT_WORDS
    : product.keywords.length < 2 && wordCount(product.productDescription) < 5;

/**
 * A warning for the products the Seller gave next to nothing to design from: a keyword at most and a description of a
 * few words. The server decides exactly which ones Ideogram fills out itself; this only points them out.
 */
export const thinInputWarning = (
  products: Pick<Product, "name" | "keywords" | "productDescription" | "customPrompt">[],
  imageProvider: string
): string | null => {
  const thin = products.filter(isThin);
  if (thin.length === 0) return null;

  const shown = thin
    .slice(0, 3)
    .map((product) => product.name)
    .join(", ");
  const more = thin.length > 3 ? ` and ${thin.length - 3} more` : "";
  const subject = thin.length === 1 ? "1 product has" : `${thin.length} products have`;
  const outcome =
    imageProvider === "ideogram"
      ? "Ideogram will fill in the details itself"
      : "their designs may come out generic";
  return `${subject} very little detail (${shown}${more}), so ${outcome}. Add keywords or a description for more control.`;
};

/**
 * A warning for the products that a lettering template would print without design text of their own: the
 * server prints the product name instead, which is a listing title rather than words meant for the design.
 */
export const missingDesignTextWarning = (
  basePrompt: string | null | undefined,
  products: Pick<Product, "name" | "designText" | "customPrompt">[]
): string | null => {
  if (!printsExactPhrase(basePrompt)) return null;
  // A product with its own image prompt prints no words without design text, never its name.
  const missing = products.filter(
    (product) => !product.designText?.trim() && !product.customPrompt?.trim()
  );
  if (missing.length === 0) return null;

  const shown = missing
    .slice(0, 3)
    .map((product) => product.name)
    .join(", ");
  const more = missing.length > 3 ? ` and ${missing.length - 3} more` : "";
  const subject = missing.length === 1 ? "1 product has" : `${missing.length} products have`;
  return `${subject} no design text for this lettering template (${shown}${more}), so the product name will be printed instead.`;
};
