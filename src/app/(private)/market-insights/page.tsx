import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({ title: "Market Insights", description: "Explore public Etsy market signals and listing metrics.", pathname: "/market-insights", robots: { index: false, follow: false } });

export default function Page() {
  redirect("/market-opportunities");
}
