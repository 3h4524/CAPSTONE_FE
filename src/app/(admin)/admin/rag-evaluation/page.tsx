"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { RagEvaluationDashboard } from "@/components/admin/rag-evaluation-dashboard";

const RagEvaluationPage = () => (
  <AdminShell>
    <RagEvaluationDashboard />
  </AdminShell>
);

export default RagEvaluationPage;
