import { Suspense } from "react";
import type { Metadata } from "next";

import { ContentSafetyDashboard } from "@/components/admin/content-safety/dashboard";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Content Safety",
  description: "What the content guardrail blocked, its blocklist, and how strict each category is.",
  pathname: "/admin/content-safety",
  robots: { index: false, follow: false },
});

// The open tab is read from the URL, which needs a Suspense boundary while the page is prerendered.
export default function ContentSafetyPage() {
  return (
    <Suspense>
      <ContentSafetyDashboard />
    </Suspense>
  );
}
