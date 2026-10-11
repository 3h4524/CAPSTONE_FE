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
  /** Background color chosen per template, keyed by template id. */
  templateBackgrounds?: Record<string, string>;
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
}

export interface GenerateAllMockupsResult {
  generatedCount: number;
  noDesignImageCount: number;
  noCompatibleTemplateCount: number;
  /** Products whose designs exist but none is approved yet (jobs that need approval). */
  noApprovedImageCount?: number;
  errors: string[];
  images: MockupImage[];
}

export interface GarmentMaskPreview {
  recolorable: boolean;
  reason: string | null;
  maskDataUrl: string | null;
}
