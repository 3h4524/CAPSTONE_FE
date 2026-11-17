import type { Metadata } from "next";

import { SystemApiKeysShell } from "@/components/admin/system-api-keys/system-api-keys-shell";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Platform API Keys",
  description: "Manage the platform's own Ideogram and MiniMax keys, their daily limits and the order they are used in.",
  pathname: "/admin/system-api-keys",
  robots: { index: false, follow: false },
});

export default function SystemApiKeysPage() {
  return <SystemApiKeysShell />;
}
