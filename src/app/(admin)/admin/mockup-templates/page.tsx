import type { Metadata } from "next";

import { PrintifyTemplateLinks } from "@/components/admin/mockup-templates/printify-template-links";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Mock-up Templates",
  description: "Link system mock-up templates to the Printify product their photo shows.",
  pathname: "/admin/mockup-templates",
  robots: { index: false, follow: false },
});

export default function MockupTemplatesPage() {
  return <PrintifyTemplateLinks />;
}
