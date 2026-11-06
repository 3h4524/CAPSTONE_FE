import type { Metadata } from "next";

import { ImageQualityDashboard } from "@/components/admin/image-quality/dashboard";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Image Quality",
  description:
    "Compare design images before and after a prompt change, from offline scoring runs and live generation data.",
  pathname: "/admin/image-quality",
  robots: { index: false, follow: false },
});

export default function ImageQualityPage() {
  return <ImageQualityDashboard />;
}
