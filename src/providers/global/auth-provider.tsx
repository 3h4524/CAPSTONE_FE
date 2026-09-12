"use client";

import { useEffect } from "react";

import { meRequest } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

// The access token lives only in an HttpOnly cookie, so client JS has no way to check "is
// there a valid session" on its own. Asking the server via /me is the only option; if the
// access-token cookie has expired, `api`'s response interceptor transparently refreshes it
// (using the HttpOnly refresh-token cookie) and retries this call before it fails.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const user = await meRequest();
        if (!cancelled) {
          useAuthStore.getState().setUser(user);
        }
      } catch {
        if (!cancelled) {
          useAuthStore.getState().clearSession();
        }
      } finally {
        if (!cancelled) {
          useAuthStore.getState().markHydrated();
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
