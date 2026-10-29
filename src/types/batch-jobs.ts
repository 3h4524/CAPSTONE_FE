export type GeneratedImage = {
  id: string;
  imageUrl: string;
  variationIndex: number;
  widthPx: number;
  heightPx: number;
  approvalStatus: string;
};

export type BatchJobProductResult = {
  id: string;
  productId: string | null;
  productName: string;
  productType: string;
  sequence: number;
  status: string;
  errorMessage: string | null;
  images: GeneratedImage[];
  /** The words the product's designs print, as the product has them now. */
  designText?: string | null;
  /** The product's own image prompt, as it has it now; null when its designs come from the template. */
  customPrompt?: string | null;
  /** The template the product's designs are made from now. */
  designTemplateId?: string | null;
  /** The instructions set for this product in the job; null uses the job's. */
  instructions?: string | null;
};

/** What a product is made from when it is generated again: empty clears the field. */
export type RegenerateProductInput = {
  customPrompt: string;
  designText: string;
  /** How many new designs to make (1-4); the job keeps its own count. */
  variationCount: number;
  /** Empty means none, rather than the job's. */
  instructions: string;
  /** Left out keeps the product's template. */
  designTemplateId?: string;
  /** Left out keeps the product's art style; empty removes it. */
  styleArtPresetId?: string;
};

export type BatchJobCounters = { pending: number; processing: number; completed: number; failed: number };

export type BatchJobDetail = {
  id: string;
  batchId: string;
  batchName: string;
  status: string;
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  variationCount: number;
  aspectRatio: string;
  counters: BatchJobCounters;
  products: BatchJobProductResult[];
  /** null for jobs started before approval existed. */
  requireApproval?: boolean | null;
  /** The workflow the job was started from; null when it was started outside one. */
  workflowId?: string | null;
};

export type BatchJobSummary = {
  id: string;
  status: string;
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  createdAt: string | null;
  startedAt: string | null;
  /** The workflow the job was started from; null when it was started outside one, or before this was recorded. */
  workflowId?: string | null;
};

export type StartBatchJobInput = {
  designTemplateId: string;
  styleArtPresetId: string | null;
  variationCount: number;
  aspectRatio: string;
  /** Extra wording added to every product's prompt in this job. */
  instructions?: string;
  /** true holds the finished designs for approval before mock-ups; false approves them automatically. */
  requireApproval?: boolean;
  /** The workflow the job is started from, recorded on the job. */
  workflowId?: string;
  /** The provider that makes the designs; the server uses Gemini when it is left out. */
  imageProvider?: ImageProvider;
};

/** The providers that can make design images, by the name their API key is stored under. */
export type ImageProvider = "gemini" | "ideogram";

export type StartBatchJobResult = { batchJobId: string; queuedProductCount: number; status: string };

export type ImageApprovalStatus = "pending" | "approved" | "rejected";

export type ImageApprovalResult = { updatedCount: number; pending: number; approved: number; rejected: number };
