import type { Metadata } from "next";

import { ApiKeysPage } from "@/components/api-keys/api-keys-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "API keys",
  description: "Review your connected services and workspace readiness.",
  pathname: "/api-keys",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <ApiKeysPage />;
}
