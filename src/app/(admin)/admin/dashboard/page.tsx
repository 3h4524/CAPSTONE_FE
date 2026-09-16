"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useCurrentUser } from "@/hooks/queries/use-current-user";

const AdminDashboardPage = () => {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isError || !user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isError, user, isAdmin, router]);

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  if (isLoading) {
    return (
      <main className="bg-muted/30 min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </section>
        </div>
      </main>
    );
  }

  if (!user || !isAdmin) {
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
            Sign out
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
