import { productLineTypes } from "@/constants/batches";
import { i18n } from "@/i18n/client";
import type { ProductLine, ProductType } from "@/types/batches";

/** A product line's name in the current language, such as "Apparel". */
export const productLineName = (line: ProductLine) => i18n.t(`batches.productLines.${line}`);

/** A product type's name in the current language, such as "T-shirt". */
export const productTypeName = (type: ProductType) => i18n.t(`mockups.productTypes.${type}`);

/** Words joined the way the current language lists them: "a, b and c", or "a or b" for a choice. */
export const listWords = (words: string[], type: "conjunction" | "disjunction") =>
  new Intl.ListFormat(i18n.language, { type }).format(words);

/** The product types of a line, listed in the current language. */
export const lineTypesText = (line: ProductLine, type: "conjunction" | "disjunction") =>
  listWords(productLineTypes[line].map(productTypeName), type);
