import type { Metadata } from "next";

import { OpportunityRadarPage } from "@/components/opportunities/opportunity-radar-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Market Opportunity Radar",
  description: "Discover and rank market opportunities for your shop.",
  pathname: "/market-opportunities",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <OpportunityRadarPage />;
}
