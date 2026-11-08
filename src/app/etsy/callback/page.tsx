import { Suspense } from "react";
import type { Metadata } from "next";

import { EtsyCallback } from "@/components/shop/etsy-callback";

export const metadata: Metadata = {
  title: "Connecting Etsy",
  robots: { index: false, follow: false },
};

/** Etsy's callback lands here, outside the app shell, so the connect popup loads fast and closes. */
export default function Page() {
  return (
    <Suspense>
      <EtsyCallback />
    </Suspense>
  );
}
