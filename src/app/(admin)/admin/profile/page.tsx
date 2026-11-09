import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { Profile } from "@/components/profile/profile";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Admin profile",
  description: "Manage your administrator name, sign-in email and preferences.",
  pathname: "/admin/profile",
  robots: { index: false, follow: false },
});

const AdminProfileRoutePage = () => (
  <AdminShell pageTitle="Profile">
    {/* The seller shell wraps pages in a card; the admin shell does not, so the form brings its own. */}
    <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
      <Profile variant="admin" />
    </div>
  </AdminShell>
);

export default AdminProfileRoutePage;
