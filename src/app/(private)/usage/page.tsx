import type { Metadata } from "next";

import { UsagePage } from "@/components/usage/usage-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Usage",
  description: "Review usage and provider costs.",
  pathname: "/usage",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <UsagePage />;
}
