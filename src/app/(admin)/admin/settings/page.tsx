import type { Metadata } from "next";

import { SettingsPage } from "@/components/settings/settings-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Admin settings",
  description: "Manage your admin appearance, regional, notification and security settings.",
  pathname: "/admin/settings",
  robots: { index: false, follow: false },
});

const AdminSettingsRoutePage = () => (
  <SettingsPage variant="admin" />
);

export default AdminSettingsRoutePage;
