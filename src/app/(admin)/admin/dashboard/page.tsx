"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { currentUserRequest, logoutRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { showToast } from "@/helpers/toast";
import type { AuthenticatedUser } from "@/types/auth";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    currentUserRequest()
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }

        if (!currentUser.roles.some((role) => role.toLowerCase() === "admin")) {
          router.replace("/");
          return;
        }

        setUser(currentUser);
      })
      .catch(() => {
        tokenStorage.clearTokens();
        router.replace("/login");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      tokenStorage.clearTokens();
      showToast("success", "You have been signed out.");
      router.replace("/login");
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">Loading dashboard...</main>
    );
  }

  if (!user) {
    return null;
  }

  return <AdminDashboardShell fullName={user.fullName} onLogout={handleLogout} />;
};

export default AdminDashboardPage;
