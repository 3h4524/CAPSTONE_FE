"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { currentUserRequest, logoutRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { showToast } from "@/helpers/toast";
import type { AuthenticatedUser } from "@/types/auth";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    setIsLoggingOut(true);
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

  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-primary flex items-center gap-2 text-sm font-semibold uppercase">
              <ShieldCheck className="size-4" />
              Admin area
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome, {user.fullName}</h1>
            <p className="text-muted-foreground mt-2">Your email OTP verification is complete.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className="size-4" />
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="bg-background rounded-xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm">Account</p>
            <p className="mt-2 font-semibold">{user.email}</p>
          </div>
          <div className="bg-background rounded-xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm">Roles</p>
            <p className="mt-2 font-semibold">{user.roles.join(", ")}</p>
          </div>
          <div className="bg-background rounded-xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm">Authentication</p>
            <p className="text-success mt-2 font-semibold">2FA verified</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboardPage;
