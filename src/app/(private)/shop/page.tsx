import { Suspense } from "react";
import type { Metadata } from "next";

import { ShopPage } from "@/components/shop/shop-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Shop",
  description: "Connect your Etsy shop and see it in APCS.",
  pathname: "/shop",
  robots: { index: false, follow: false },
});

export default function Page() {
  // The page reads Etsy's return outcome from the query string.
  return (
    <Suspense>
      <ShopPage />
    </Suspense>
  );
}
