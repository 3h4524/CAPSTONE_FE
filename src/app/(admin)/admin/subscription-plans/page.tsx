"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AdminSubscriptionPlansShell } from "@/components/admin/subscription-plans/admin-subscription-plans-shell";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAdminSubscriptionPlans } from "@/hooks/queries/use-admin-subscription-plans";
import { useAuthStore } from "@/stores/auth";

const AdminSubscriptionPlansPage = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const { data: plans, isLoading: isPlansLoading } = useAdminSubscriptionPlans();
  const { mutate: logout } = useLogout();

  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isHydrated, user, isAdmin, router]);

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  if (!isHydrated) {
    return <PageLoading label="Loading subscription plans" />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AdminSubscriptionPlansShell
      fullName={user.fullName}
      onLogout={handleLogout}
      plans={plans ?? []}
      isLoading={isPlansLoading}
    />
  );
};

export default AdminSubscriptionPlansPage;
