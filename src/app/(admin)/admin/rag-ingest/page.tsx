"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AdminRagIngestShell } from "@/components/admin/admin-rag-ingest-shell";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";

const AdminRagIngestPage = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const { mutate: logout } = useLogout();
  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) router.replace("/login");
    else if (!isAdmin) router.replace("/");
  }, [isHydrated, user, isAdmin, router]);

  if (!isHydrated) return <PageLoading label="Loading RAG workspace" />;
  if (!user || !isAdmin) return null;

  return <AdminRagIngestShell fullName={user.fullName} onLogout={() => logout(undefined, { onSettled: () => router.replace("/login") })} />;
};

export default AdminRagIngestPage;
