"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ETSY_CONNECTION_MESSAGE } from "@/components/shop/etsy-connection";

/**
 * In the connect popup: hands Etsy's outcome to the shop page that opened it, then closes.
 * Opened as a full page (the popup was blocked): forwards to the shop page with the outcome.
 */
export function EtsyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [closeFailed, setCloseFailed] = useState(false);

  useEffect(() => {
    const outcome = searchParams.get("etsy") ?? "failed";
    const opener = window.opener as Window | null;
    if (opener && !opener.closed) {
      // Same origin only: the outcome is for the APCS page that opened the popup.
      opener.postMessage({ type: ETSY_CONNECTION_MESSAGE, outcome }, window.location.origin);
      window.close();
      // Some browsers refuse to close a window the script did not open by itself.
      const timer = window.setTimeout(() => setCloseFailed(true), 800);
      return () => window.clearTimeout(timer);
    }
    router.replace(`/shop?etsy=${encodeURIComponent(outcome)}`);
    return undefined;
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-card p-6 text-center text-sm text-ink-600">
      {closeFailed ? (
        <p>Done. You can close this window and return to APCS.</p>
      ) : (
        <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Finishing the Etsy connection…</p>
      )}
    </main>
  );
}
