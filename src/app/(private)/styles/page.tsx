import type { Metadata } from "next";

import { StylesPage } from "@/components/styles/styles-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "My Styles",
  description: "Browse system art styles and manage styles you created.",
  pathname: "/styles",
  robots: { index: false, follow: false },
});

export default function Page() {
  return <StylesPage />;
}
