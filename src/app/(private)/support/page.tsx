import type { Metadata } from "next";

import { SupportCenter } from "@/components/support/support-center";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Support Center",
  description: "Create and track Podivo support tickets.",
  pathname: "/support",
  robots: { index: false, follow: false },
});

export default function SupportPage() {
  return <SupportCenter />;
}
