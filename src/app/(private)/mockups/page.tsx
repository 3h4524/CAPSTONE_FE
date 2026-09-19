import type { Metadata } from "next";

import { MockupTemplateHost } from "@/components/batch-setup/mockup-template/mockup-template-host";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Mock-up Templates",
  description: "Temporary host to verify the mock-up template picker.",
  pathname: "/mockups",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <MockupTemplateHost />;
}
