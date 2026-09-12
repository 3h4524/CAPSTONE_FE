import { Suspense } from "react";
import type { Metadata } from "next";

import { SupportCenter } from "@/components/support/support-center";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Support Center | APCS",
  description: "Create and track APCS support tickets.",
};

export default function SupportPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-6xl px-4 py-12 sm:px-6"><Skeleton className="h-[560px] rounded-2xl" /></main>}>
      <SupportCenter />
    </Suspense>
  );
}
