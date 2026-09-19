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
}

export interface BatchMockupSelection {
  batchJobId: string;
  templateIds: string[];
}
