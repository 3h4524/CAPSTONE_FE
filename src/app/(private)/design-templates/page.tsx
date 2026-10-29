import type { Metadata } from "next";

import { DesignTemplateLibrary } from "@/components/design-templates/design-template-library";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Design Template Library",
  description: "Browse system prompt templates and manage personal design templates.",
  pathname: "/design-templates",
  robots: { index: false, follow: false },
});

export default function DesignTemplatesPage() {
  return <DesignTemplateLibrary />;
}
