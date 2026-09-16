import type { Metadata } from "next";

import { SupportCenter } from "@/components/support/support-center";

export const metadata: Metadata = {
  title: "Support Center",
  description: "Create and track APCS support tickets.",
};

export default function SupportPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SupportCenter />
    </div>
  );
}
