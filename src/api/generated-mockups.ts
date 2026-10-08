import { api } from "@/api/client";
import type { MockupAsset } from "@/types/video-workflow";

export interface ImportGeneratedMockupsResult {
  importedCount: number;
  failedCount: number;
  /** Every mock-up of the product that can be a video source, the imported ones included. */
  mockups: MockupAsset[];
}

// A composited mock-up is a rendered URL, while a video is made from stored images. This stores the product's
// composited mock-ups so they appear among its video sources. Safe to repeat: each mock-up is imported once.
export const importGeneratedMockups = async (productId: string): Promise<ImportGeneratedMockupsResult> =>
  (await api.post<ImportGeneratedMockupsResult>(`/api/products/${productId}/mockup-assets/import-generated`)).data;
