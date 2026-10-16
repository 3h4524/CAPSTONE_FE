export interface MockupTemplate {
  id: string;
  name: string;
  productType: string;
  baseImageUrl: string;
  previewImageUrl: string | null;
  printAreaConfig: string;
  outputWidthPx: number;
  outputHeightPx: number;
  usageCount: number;
  isSystemTemplate: boolean;
  isMine: boolean;
  realisticPrintReady: boolean;
  allowRecolor: boolean;
  garmentMaskUrl: string | null;
  garmentColor: string | null;
  /** Whether a run may put the garment on another background (the photo has been analyzed). */
  allowBackground?: boolean;
}

export interface BatchMockupSelection {
  batchJobId: string;
  templateIds: string[];
  /** Colors shared by recolorable templates that have none of their own (older selections only). */
  garmentColors: string[];
  /** Colors chosen per template, keyed by template id. */
  templateColors?: Record<string, string[]>;
  /** Background colors chosen per template, keyed by template id and then by garment color or "default". */
  templateBackgrounds?: Record<string, Record<string, string>>;
}

export interface MockupPrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MockupImage {
  id: string;
  productId: string;
  designImageId: string;
  mockupTemplateId: string;
  mockupImageUrl: string;
  mockupWidthPx: number;
  mockupHeightPx: number;
  approvalStatus: string;
  garmentColor: string | null;
  /** '#RRGGBB' when the mock-up was put on a replaced background. */
  backgroundColor?: string | null;
  /** In a batch job's results, which of the job's mock-ups this is: what a change to it alone is saved under. */
  slotKey?: string | null;
  /** In a batch job's results, how this mock-up is made apart from the job's settings, when it is. */
  override?: MockupOverride | null;
}

/** How one mock-up of a batch job is made instead of by the job's settings. The job keeps it. */
export interface MockupOverride {
  mockupTemplateId: string;
  /** null keeps the template's own garment color. */
  garmentColor: string | null;
  /** null keeps the photo's own background. */
  backgroundColor: string | null;
  /** null uses the template's own print area. */
  printArea: MockupPrintArea | null;
  /** true when no mock-up is made there at all. */
  removed?: boolean;
}

/** A mock-up the job's settings would make that was removed for its product alone. */
export interface RemovedMockupSlot {
  slotKey: string;
  productId: string;
  designImageId: string;
  mockupTemplateId: string;
  templateName: string;
  garmentColor: string | null;
}

export interface GenerateAllMockupsResult {
  generatedCount: number;
  noDesignImageCount: number;
  noCompatibleTemplateCount: number;
  /** Products whose designs exist but none is approved yet (jobs that need approval). */
  noApprovedImageCount?: number;
  errors: string[];
  images: MockupImage[];
  removed?: RemovedMockupSlot[] | null;
}

export interface GarmentMaskPreview {
  recolorable: boolean;
  reason: string | null;
  maskDataUrl: string | null;
}
