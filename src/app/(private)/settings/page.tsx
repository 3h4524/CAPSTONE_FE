import type { Metadata } from "next";

import { SettingsPage } from "@/components/settings/settings-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Settings",
  description: "Manage your Podivo appearance, regional and notification preferences.",
  pathname: "/settings",
  robots: { index: false, follow: false },
});

export default function SettingsRoutePage() {
  return <SettingsPage />;
}
