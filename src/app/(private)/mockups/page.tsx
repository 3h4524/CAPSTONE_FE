import type { Metadata } from "next";

import { MockupTemplatesPage } from "@/components/mockups/mockup-templates-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Mock-up Templates",
  description: "Browse system mock-ups and manage the product photos you uploaded.",
  pathname: "/mockups",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <MockupTemplatesPage />;
}
