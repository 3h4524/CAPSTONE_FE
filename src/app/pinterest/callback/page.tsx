import { Suspense } from "react";
import type { Metadata } from "next";

import { PinterestCallback } from "@/components/social/pinterest-callback";

export const metadata: Metadata = {
  title: "Connecting Pinterest",
  robots: { index: false, follow: false },
};

/** Pinterest's callback lands here, outside the app shell, so the connect popup loads fast and closes. */
export default function Page() {
  return (
    <Suspense>
      <PinterestCallback />
    </Suspense>
  );
}
