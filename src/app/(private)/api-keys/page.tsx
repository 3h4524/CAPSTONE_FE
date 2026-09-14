import type { Metadata } from "next";

import { ApiKeysPage } from "@/components/api-keys/api-keys-page";

export const metadata: Metadata = {
  title: "API keys | APCS",
  description: "Review your connected services and workspace readiness.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ApiKeysPage />;
}
