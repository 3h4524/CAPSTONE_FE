"use client";

import { AdminRagIngestShell } from "@/components/admin/admin-rag-ingest-shell";
import { AdminShell } from "@/components/admin/admin-shell";

const AdminMarketInsightsPage = () => (
  <AdminShell>
    <AdminRagIngestShell initialTab="research" />
  </AdminShell>
);

export default AdminMarketInsightsPage;
