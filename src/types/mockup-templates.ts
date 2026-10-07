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
}

export interface BatchMockupSelection {
  batchJobId: string;
  templateIds: string[];
  garmentColors: string[];
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
}

export interface GenerateAllMockupsResult {
  generatedCount: number;
  noDesignImageCount: number;
  noCompatibleTemplateCount: number;
  errors: string[];
  images: MockupImage[];
}

export interface GarmentMaskPreview {
  recolorable: boolean;
  reason: string | null;
  maskDataUrl: string | null;
}
