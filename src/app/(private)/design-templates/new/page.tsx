import type { Metadata } from "next";

import { DesignTemplateEditor } from "@/components/design-templates/design-template-editor";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Create Design Template",
  description: "Create a reusable personal design prompt template.",
  pathname: "/design-templates/new",
  robots: { index: false, follow: false },
});

export default function NewDesignTemplatePage() {
  return <DesignTemplateEditor />;
}
