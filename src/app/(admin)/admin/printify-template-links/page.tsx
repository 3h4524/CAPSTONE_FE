import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { PrintifyTemplateLinks } from "@/components/admin/mockup-templates/printify-template-links";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Printify Template Links",
  description: "Link system mock-up templates to the Printify product their photo shows.",
  pathname: "/admin/printify-template-links",
  robots: { index: false, follow: false },
});

export default function PrintifyTemplateLinksPage() {
  return (
    <AdminShell pageTitle="Printify Template Links">
      <PrintifyTemplateLinks />
    </AdminShell>
  );
}
