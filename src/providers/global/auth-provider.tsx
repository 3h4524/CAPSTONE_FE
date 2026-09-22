"use client";

import { useEffect } from "react";

import { meRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import type { AuthenticatedUser } from "@/types/auth";

let sessionCheck: Promise<AuthenticatedUser | null> | null = null;

const checkSession = () => {
  sessionCheck ??= meRequest()
    .catch(() => null)
    .finally(() => {
      sessionCheck = null;
    });

  return sessionCheck;
};

// The access token lives only in an HttpOnly cookie, so client JS has no way to check "is
// there a valid session" on its own. Asking the server via /me is the only option; if the
// access-token cookie has expired, `api`'s response interceptor transparently refreshes it
// (using the HttpOnly refresh-token cookie) and retries this call before it fails.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const auth = useAuthStore.getState();

      // Login already verified the session and populated this in-memory store. Reuse it on
      // client navigation instead of querying /me again.
      if (auth.user) {
        auth.markHydrated();
        return;
      }

      const user = await checkSession();
      if (cancelled) return;

      if (user) useAuthStore.getState().setUser(user);
      else useAuthStore.getState().clearSession();
      useAuthStore.getState().markHydrated();
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
