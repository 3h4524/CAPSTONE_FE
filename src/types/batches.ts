export type Batch = { id: string; name: string; description: string | null; defaultNiche: string | null; defaultProductType: string | null; status: string; createdAt: string; productCount: number };
export type Product = { id: string; batchId: string; name: string; productType: ProductType; niche: string | null; keywords: string[]; productDescription: string | null; sourceNotes: string | null; status: string; createdAt: string | null };
export type ProductType = "tshirt" | "hoodie" | "mug" | "poster" | "tote_bag" | "phone_case";
export type SaveBatchInput = { name: string; description?: string; defaultNiche?: string; defaultProductType?: ProductType };
export type SaveProductInput = { name: string; productType: ProductType; niche?: string; keywords: string[]; productDescription?: string; sourceNotes?: string };
export type BatchProductImportResult = { importedCount: number; errors: Array<{ row: number; name: string; message: string }> };
export type ApproveBatchResult = { batchId: string; batchJobId: string; queuedProductCount: number; status: string };
export type BatchProductImportRow = { row: number; product: SaveProductInput };
