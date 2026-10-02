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
}

export interface BatchMockupSelection {
  batchJobId: string;
  templateIds: string[];
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
}

export interface GenerateAllMockupsResult {
  generatedCount: number;
  noDesignImageCount: number;
  noCompatibleTemplateCount: number;
  errors: string[];
  images: MockupImage[];
}
