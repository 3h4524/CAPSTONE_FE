"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  isPinterestOutcome,
  PINTEREST_CONNECTION_MESSAGE,
  PINTEREST_OUTCOME_MESSAGES,
  PINTEREST_RETURN_KEY,
} from "@/components/social/pinterest-connection";

/** Only a path of this app is a place to return to. */
const safeReturnPath = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/workflows");

/**
 * In the connect popup: hands Pinterest's outcome to the page that opened it, then closes.
 * Opened as a full page (the popup was blocked): shows the outcome and returns to the page the seller left.
 */
export function PinterestCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [closeFailed, setCloseFailed] = useState(false);

  useEffect(() => {
    const raw = searchParams.get("pinterest");
    const outcome = isPinterestOutcome(raw) ? raw : "failed";
    const opener = window.opener as Window | null;
    if (opener && !opener.closed) {
      // Same origin only: the outcome is for the APCS page that opened the popup.
      opener.postMessage({ type: PINTEREST_CONNECTION_MESSAGE, outcome }, window.location.origin);
      window.close();
      // Some browsers refuse to close a window the script did not open by itself.
      const timer = window.setTimeout(() => setCloseFailed(true), 800);
      return () => window.clearTimeout(timer);
    }
    let back: string | null = null;
    try {
      back = window.sessionStorage.getItem(PINTEREST_RETURN_KEY);
      window.sessionStorage.removeItem(PINTEREST_RETURN_KEY);
    } catch {
      back = null;
    }
    const message = PINTEREST_OUTCOME_MESSAGES[outcome];
    if (message.failed) toast.error(message.text);
    else toast.success(message.text);
    router.replace(safeReturnPath(back));
    return undefined;
  }, [router, searchParams]);

  return (
    <main className="bg-card text-ink-600 flex min-h-screen items-center justify-center p-6 text-center text-sm">
      {closeFailed ? (
        <p>Done. You can close this window and return to Podivo.</p>
      ) : (
        <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Finishing the Pinterest connection…</p>
      )}
    </main>
  );
}
