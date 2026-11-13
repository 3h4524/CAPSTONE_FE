"use client";

import { Suspense } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSubscriptionPlansContent } from "@/components/admin/subscription-plans/admin-subscription-plans-content";
import { useAdminSubscriptionPlans } from "@/hooks/queries/use-admin-subscription-plans";

const AdminSubscriptionPlansPage = () => {
  const { data: plans, isLoading: isPlansLoading } = useAdminSubscriptionPlans();

  // The content reads ?view= from the URL, which needs a Suspense boundary.
  return (
    <AdminShell>
      <Suspense fallback={null}>
        <AdminSubscriptionPlansContent plans={plans ?? []} isLoading={isPlansLoading} />
      </Suspense>
    </AdminShell>
  );
};

export default AdminSubscriptionPlansPage;
