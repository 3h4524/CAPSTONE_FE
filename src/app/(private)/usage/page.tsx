import type { Metadata } from "next";

import { UsagePage } from "@/components/usage/usage-page";

export const metadata: Metadata = {
  title: "Usage | APCS",
  description: "Review usage and provider costs.",
};
export default function Page() {
  return <UsagePage />;
}
