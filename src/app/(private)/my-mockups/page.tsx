import type { Metadata } from "next";

import { MyMockupsPage } from "@/components/my-mockups/my-mockups-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "My Mock-ups",
  description: "Browse system mock-up templates and manage templates you created.",
  pathname: "/my-mockups",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <MyMockupsPage />;
}
