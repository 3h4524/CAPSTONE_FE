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
};

export type BatchJobSummary = {
  id: string;
  status: string;
  totalProducts: number;
  processedProducts: number;
  failedProducts: number;
  createdAt: string | null;
  startedAt: string | null;
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
};

export type StartBatchJobResult = { batchJobId: string; queuedProductCount: number; status: string };

export type ImageApprovalStatus = "pending" | "approved" | "rejected";

export type ImageApprovalResult = { updatedCount: number; pending: number; approved: number; rejected: number };
