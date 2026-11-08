import { productSchema } from "@/schemas/batches";
import type { BatchProductImportRow, ProductType, SaveProductInput } from "@/types/batches";

export type ImportRow = BatchProductImportRow & { issues: string[] };

const MAX_IMPORT_ROWS = 500;

const cellText = (value: unknown) => String(value ?? "").trim();
const normalizeImportHeader = (value: unknown) => {
  const header = cellText(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["name", "productname"].includes(header)) return "name";
  if (["type", "producttype"].includes(header)) return "producttype";
  if (header === "niche") return "niche";
  if (header === "keywords") return "keywords";
  if (["description", "productdescription"].includes(header)) return "productdescription";
  if (["notes", "sourcenotes"].includes(header)) return "sourcenotes";
  if (["designtext", "text", "slogan", "phrase"].includes(header)) return "designtext";
  if (["imageprompt", "prompt", "customprompt"].includes(header)) return "customprompt";
  return header;
};
const productTypeAliases: Record<string, ProductType> = {
  tshirt: "tshirt",
  hoodie: "hoodie",
  mug: "mug",
  poster: "poster",
  totebag: "tote_bag",
  phonecase: "phone_case",
};

/** Turns a worksheet into product rows, each with what is wrong with it, or says why it cannot be read. */
export const parseProductSheet = (sheetRows: unknown[][]): { rows: ImportRow[] } | { error: string } => {
  const headers = (sheetRows[0] ?? []).map(normalizeImportHeader);
  const requiredHeaders = ["name", "producttype", "niche", "keywords"];
  if (requiredHeaders.some((header) => !headers.includes(header))) {
    return { error: "The Products worksheet must include Product name, Product type, Niche and Keywords columns." };
  }
  const column = (name: string) => headers.indexOf(normalizeImportHeader(name));
  const rows: ImportRow[] = sheetRows.slice(1).map((record, index) => {
    const name = cellText(record[column("name")]);
    const productTypeText = cellText(record[column("productType")]).toLowerCase().replace(/[^a-z0-9]/g, "");
    const productType = productTypeAliases[productTypeText] ?? productTypeText as ProductType;
    const niche = cellText(record[column("niche")]);
    const keywordsText = cellText(record[column("keywords")]);
    const keywords = keywordsText.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
    const productDescription = column("productDescription") < 0 ? "" : cellText(record[column("productDescription")]);
    const sourceNotes = column("sourceNotes") < 0 ? "" : cellText(record[column("sourceNotes")]);
    const designText = column("designText") < 0 ? "" : cellText(record[column("designText")]);
    const customPrompt = column("customPrompt") < 0 ? "" : cellText(record[column("customPrompt")]);
    const input: SaveProductInput = { name, productType, niche, keywords, productDescription: productDescription || undefined, sourceNotes: sourceNotes || undefined, designText: designText || undefined, customPrompt: customPrompt || undefined };
    const parsed = productSchema.safeParse({ name, productType, niche, keywords: keywordsText, productDescription, sourceNotes, designText, customPrompt });
    const issues = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    return { row: index + 2, product: input, issues: [...new Set(issues)] };
  }).filter((row) => row.product.name || row.product.productType || row.product.niche || row.product.keywords.length || row.product.productDescription || row.product.sourceNotes || row.product.designText || row.product.customPrompt);
  if (sheetRows.length - 1 > MAX_IMPORT_ROWS) return { error: "A file can contain up to 500 product rows per import." };
  if (!rows.length) return { error: "No product rows found. Use the Products worksheet and keep the provided column headers." };
  return { rows };
};
