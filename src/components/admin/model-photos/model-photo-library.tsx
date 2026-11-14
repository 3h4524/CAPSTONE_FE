"use client";

import { PageHeader } from "@/components/commons/layout/page-header";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";

export const ModelPhotoLibrary = () => (
  <div className="flex flex-col gap-6">
    <PageHeader
      title="Model photo library"
      description="Sellers put a mock-up on one of these photos in their video workflow. The person’s garment is recolored to the mock-up’s color and the design is printed where it sits on the mock-up, without AI."
    />
    <ModelPhotosPanel scope="admin" />
  </div>
);
