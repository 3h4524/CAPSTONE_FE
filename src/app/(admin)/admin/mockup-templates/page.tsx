import type { Metadata } from "next";

import { MockupTemplateLibrary } from "@/components/admin/mockup-templates/mockup-template-library";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Mock-up Templates",
  description: "Manage the shared mock-up templates every seller can use, including templates of Printify products.",
  pathname: "/admin/mockup-templates",
  robots: { index: false, follow: false },
});

export default function MockupTemplatesAdminPage() {
  return <MockupTemplateLibrary />;
}
