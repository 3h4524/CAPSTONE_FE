"use client";

import Link from "next/link";
import { AlertTriangle, KeyRound, Loader2, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getPrintifyConnection, type PrintifyConnection } from "@/api/printify";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const printifyKey = (userId?: string) => ["printify-connection", userId] as const;

/** What each state means for the seller, and whether the fix is on the API Keys page. */
const states: Record<PrintifyConnection["status"], { badge: string; tone: string; text: string; fixOnApiKeys: boolean }> = {
  connected: { badge: "Connected", tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30", text: "", fixOnApiKeys: false },
  not_connected: { badge: "Not connected", tone: "bg-ink-50 text-ink-600 ring-ink-200", text: "Add your Printify API key on the API Keys page to print and ship designs when Etsy orders come in.", fixOnApiKeys: true },
  key_invalid: { badge: "Key not working", tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30", text: "Your Printify key is disabled, expired or was refused by Printify. Check or replace it on the API Keys page.", fixOnApiKeys: true },
  no_store: { badge: "No store", tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30", text: "The key works, but your Printify account has no store. On Printify, add a store linked to your Etsy shop (My stores → Add new store → Etsy).", fixOnApiKeys: false },
  unavailable: { badge: "Unavailable", tone: "bg-ink-50 text-ink-600 ring-ink-200", text: "Printify is not answering right now. Your key is still saved; check again in a moment.", fixOnApiKeys: false },
};

/**
 * Whether Printify is ready to print what the seller sells on Etsy. The key is entered and checked on the API Keys
 * page; this card only reports the connection and the store it publishes through.
 */
export function PrintifyCard() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const connectionQuery = useQuery({ queryKey: printifyKey(userId), queryFn: () => getPrintifyConnection(), enabled: Boolean(userId) });
  const checkMutation = useMutation({
    mutationFn: () => getPrintifyConnection(true),
    onSuccess: (connection) => {
      queryClient.setQueryData(printifyKey(userId), connection);
      if (connection.status === "connected") toast.success(`Printify store ${connection.shopTitle ?? ""} is ready.`);
      else toast.warning(states[connection.status].text);
    },
    onError: () => toast.error("Could not check Printify. Try again."),
  });

  const connection = connectionQuery.data;
  const state = connection ? states[connection.status] : null;
  const connected = connection?.status === "connected";

  return (
    <Card className="border-ink-200 bg-card gap-0 overflow-hidden py-0 shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4 max-md:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"><Printer className="size-5" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-ink-900 font-semibold">Printify</h3>
              {connectionQuery.isPending && <Loader2 className="text-ink-400 size-3.5 animate-spin" />}
              {state && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${state.tone}`}>{state.badge}</span>}
            </div>
            <p className="text-ink-500 text-xs">
              {connected
                ? `${connection.shopTitle} · publishes to ${connection.salesChannel ?? "no channel"} · ${connection.productsCreated} product(s) sent from Podivo${connection.keyName ? ` · key “${connection.keyName}”` : ""}`
                : state?.text ?? "Prints and ships your designs when an Etsy order comes in."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 max-md:grid max-md:grid-cols-2">
          <Button type="button" size="sm" variant="outline" className="max-md:px-2" onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending || connectionQuery.isPending}>
            <RefreshCw className={checkMutation.isPending ? "size-3.5 animate-spin" : "size-3.5"} />Check connection
          </Button>
          <Button asChild size="sm" variant={state?.fixOnApiKeys ? "default" : "outline"} className="max-md:px-2">
            <Link href="/api-keys"><KeyRound className="size-3.5" />{connection?.status === "not_connected" ? "Add Printify key" : "Manage key"}</Link>
          </Button>
        </div>
      </div>
      {connected && connection.salesChannel !== "etsy" && (
        <p className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-5 py-2.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          This Printify store is not linked to Etsy, so products published from it will not reach your Etsy shop. Link it on Printify (My stores → Add new store → Etsy).
        </p>
      )}
    </Card>
  );
}
