import type { Metadata } from "next";

import { ModelPhotoLibrary } from "@/components/admin/model-photos/model-photo-library";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Model Photos",
  description: "Manage the shared photos of people that sellers put their mock-ups on.",
  pathname: "/admin/model-photos",
  robots: { index: false, follow: false },
});

export default function ModelPhotosPage() {
  return <ModelPhotoLibrary />;
}
