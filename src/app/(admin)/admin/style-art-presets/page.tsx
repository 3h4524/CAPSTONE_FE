import type { Metadata } from "next";

import { StyleArtPresetsShell } from "@/components/admin/style-art-presets/style-art-presets-shell";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "System Styles",
  description: "Manage the system art styles sellers see, with Vietnamese translations.",
  pathname: "/admin/style-art-presets",
  robots: { index: false, follow: false },
});

export default function SystemStylesPage() {
  return <StyleArtPresetsShell />;
}
