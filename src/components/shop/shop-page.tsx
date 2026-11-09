"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Eye, Heart, Loader2, Package, PencilLine, Receipt, RefreshCw, ShieldCheck, ShoppingBag, Star, Store, Unplug } from "lucide-react";
import { toast } from "sonner";

import { disconnectEtsy, type EtsyConnectionOutcome, getMyShop, getShopInsights, type MyShop } from "@/api/shop";
import { useEtsyConnect } from "@/components/shop/etsy-connection";
import { PrintifyCard } from "@/components/shop/printify-card";
import { ShopInsightsPanel } from "@/components/shop/shop-insights";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const shopKey = (userId?: string) => ["my-shop", userId] as const;

/** What each return outcome from Etsy means for the seller, and whether it is a failure. */
const outcomeMessages: Record<EtsyConnectionOutcome, { text: string; failed: boolean }> = {
  connected: { text: "Your Etsy shop is connected.", failed: false },
  denied: { text: "You declined the Etsy permission request, so nothing was connected.", failed: true },
  expired: { text: "The connection request expired or was already used. Start again.", failed: true },
  no_shop: { text: "This Etsy account has no shop yet. Open a shop on Etsy, then connect again.", failed: true },
  failed: { text: "Etsy could not complete the connection. Try again in a moment.", failed: true },
};

/** The permissions requested on Etsy's consent page, in the seller's terms. */
const permissions = [
  { icon: Store, title: "Read your shop", detail: "Name, listings count, sales and reviews, to show them here." },
  { icon: Eye, title: "Read your listings", detail: "To compare what you sell with the Market Radar." },
  { icon: Receipt, title: "Read your orders", detail: "Revenue, orders per day and fulfilment time. Podivo never changes or ships an order." },
  { icon: PencilLine, title: "Create draft listings", detail: "To send workflow designs, mockups and videos as drafts. Nothing goes live until you publish it on Etsy." },
];

const insightsKey = (userId?: string) => ["shop-insights", userId] as const;

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export function ShopPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = useAuthStore((state) => state.user?.id);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const shopQuery = useQuery({ queryKey: shopKey(userId), queryFn: getMyShop, enabled: isHydrated && Boolean(userId) });

  const showOutcome = useCallback((outcome: EtsyConnectionOutcome) => {
    const message = outcomeMessages[outcome];
    setNotice(message);
    if (message.failed) toast.error(message.text);
    else toast.success(message.text);
    queryClient.invalidateQueries({ queryKey: shopKey(userId) });
  }, [queryClient, userId]);

  // Etsy's consent page normally runs in a popup that reports back by message.
  const etsyConnect = useEtsyConnect(showOutcome);

  // Without the popup (blocked), the callback page forwards here with ?etsy=<outcome>: show it once and clean the address.
  useEffect(() => {
    const outcome = searchParams.get("etsy") as EtsyConnectionOutcome | null;
    if (!outcome || !(outcome in outcomeMessages)) return;
    showOutcome(outcome);
    router.replace(pathname);
  }, [pathname, router, searchParams, showOutcome]);

  const disconnectMutation = useMutation({
    mutationFn: disconnectEtsy,
    onSuccess: () => {
      setConfirmDisconnect(false);
      toast.success("Etsy shop disconnected.");
      queryClient.invalidateQueries({ queryKey: shopKey(userId) });
    },
    onError: () => toast.error("Could not disconnect the shop. Try again."),
  });

  const data = shopQuery.data;
  // Called straight from the click, not through a mutation: the popup must open within the click or the browser blocks it.
  const connect = () => {
    etsyConnect.connect().catch(() => toast.error("Could not start the Etsy connection. Try again."));
  };
  const connecting = etsyConnect.starting || etsyConnect.waiting;

  return (
    // The bottom padding keeps the last line clear of the floating assistant button.
    <div className="flex w-full min-w-0 flex-col gap-5 max-md:gap-3 max-md:pb-14 md:p-6">
      {etsyConnect.waiting && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300" role="status">
          <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Finish signing in to Etsy in the popup window.</span>
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={etsyConnect.focusPopup}>Show the Etsy window</Button>
        </div>
      )}
      {notice && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.failed ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"}`} role="status">
          {notice.failed ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {!isHydrated || shopQuery.isPending ? (
        <Card className="border-ink-200 bg-card text-ink-500 flex min-h-64 items-center justify-center text-sm" role="status">
          <Loader2 className="mr-2 size-4 animate-spin" />Loading your shop…
        </Card>
      ) : shopQuery.isError || !data ? (
        <Card className="border-ink-200 bg-card text-ink-600 flex min-h-40 flex-col items-center justify-center gap-3 text-sm">
          <p>Your shop could not be loaded.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => shopQuery.refetch()}><RefreshCw className="size-3.5" />Try again</Button>
        </Card>
      ) : data.status === "not_connected" ? (
        <ConnectGate data={data} connecting={connecting} onConnect={connect} />
      ) : (
        <ConnectedShop
          data={data}
          connecting={connecting}
          onReconnect={connect}
          confirmDisconnect={confirmDisconnect}
          onAskDisconnect={() => setConfirmDisconnect(true)}
          onCancelDisconnect={() => setConfirmDisconnect(false)}
          onDisconnect={() => disconnectMutation.mutate()}
          disconnecting={disconnectMutation.isPending}
        />
      )}

      {/* Etsy's API terms ask applications to show this notice. */}
      <p className="text-ink-400 text-center text-[11px]">
        The term &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
      </p>
    </div>
  );
}

/** Shown until a shop is connected: the seller connects Etsy before anything else here. */
function ConnectGate({ data, connecting, onConnect }: { data: MyShop; connecting: boolean; onConnect: () => void }) {
  return (
    <Card className="border-ink-200 bg-card mx-auto w-full max-w-2xl gap-0 overflow-hidden py-0 shadow-sm">
      <div className="to-card flex flex-col items-center gap-3 bg-gradient-to-b from-orange-50 px-6 pt-8 pb-6 text-center dark:from-orange-500/10">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#F1641E] text-white shadow-md"><ShoppingBag className="size-7" /></span>
        <h2 className="text-ink-900 text-xl font-semibold">Connect your Etsy shop</h2>
        <p className="text-ink-600 max-w-md text-sm leading-6">
          Connect once to see your shop here and send what your workflows make straight to Etsy as drafts.
          You sign in on Etsy; Podivo never sees your Etsy password.
        </p>
      </div>
      <ul className="divide-ink-100 border-ink-100 divide-y border-y">
        {permissions.map((item) => (
          <li key={item.title} className="flex items-start gap-3 px-6 py-3">
            <span className="bg-ink-100 text-ink-600 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"><item.icon className="size-4" /></span>
            <div>
              <p className="text-ink-900 text-sm font-semibold">{item.title}</p>
              <p className="text-ink-500 text-xs leading-5">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-2 px-6 py-5">
        {data.etsyConfigured ? (
          <Button type="button" className="h-11 w-full max-w-xs bg-[#F1641E] text-white hover:bg-[#d9561a]" onClick={onConnect} disabled={connecting}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4" />}
            {connecting ? "Waiting for Etsy…" : "Connect with Etsy"}
          </Button>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">Etsy is not configured on this server yet. Ask the administrator to add the Etsy app key.</p>
        )}
        <p className="text-ink-500 flex items-center gap-1.5 text-[11px]"><ShieldCheck className="size-3.5" />Tokens are stored encrypted. You can disconnect at any time.</p>
      </div>
    </Card>
  );
}

function ConnectedShop({
  data,
  connecting,
  onReconnect,
  confirmDisconnect,
  onAskDisconnect,
  onCancelDisconnect,
  onDisconnect,
  disconnecting,
}: {
  data: MyShop;
  connecting: boolean;
  onReconnect: () => void;
  confirmDisconnect: boolean;
  onAskDisconnect: () => void;
  onCancelDisconnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const shop = data.shop!;
  const needsReconnect = data.status === "reconnect_required";
  const isPhone = useIsPhone();
  // Rarely needed on a phone, so they open on request; Disconnect stays in view.
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  // Etsy reports 0.0 for a shop nobody has reviewed, which reads as a bad score on a small card.
  const hasNoReviews = isPhone && shop.reviewCount === 0;
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  // Insights need a working grant; a lost one is fixed by reconnecting first.
  const canReadInsights = data.status === "connected" || data.status === "unavailable";
  const insightsQuery = useQuery({
    queryKey: insightsKey(userId),
    queryFn: () => getShopInsights(),
    enabled: canReadInsights,
    staleTime: 5 * 60_000,
  });
  const syncMutation = useMutation({
    mutationFn: () => getShopInsights(true),
    onSuccess: (insights) => {
      queryClient.setQueryData(insightsKey(userId), insights);
      queryClient.invalidateQueries({ queryKey: ["my-shop", userId] });
    },
    onError: () => toast.error("Could not read Etsy right now. Try again in a moment."),
  });
  const sync = () => syncMutation.mutate();
  const syncing = syncMutation.isPending;
  const stats = [
    { icon: Package, label: "Active listings", value: shop.activeListingCount },
    { icon: ShoppingBag, label: "All-time sales", value: shop.soldCount },
    { icon: Heart, label: "Shop favorites", value: shop.favorerCount },
    {
      icon: Star,
      label: "Rating",
      value: shop.reviewAverage == null || hasNoReviews ? null : `${shop.reviewAverage.toFixed(1)} / 5`,
      hint: hasNoReviews ? "No reviews yet" : shop.reviewCount == null ? undefined : `${shop.reviewCount} reviews`,
    },
  ];

  return (
    <div className="flex flex-col gap-4 max-md:gap-3">
      {needsReconnect && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            The Etsy connection expired or was revoked. Connect again to keep reading your shop and sending drafts.
          </p>
          <Button type="button" size="sm" className="shrink-0 bg-[#F1641E] text-white hover:bg-[#d9561a]" onClick={onReconnect} disabled={connecting}>
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}Reconnect Etsy
          </Button>
        </div>
      )}
      {data.status === "unavailable" && (
        <p className="border-ink-200 bg-ink-50 text-ink-700 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
          <AlertTriangle className="text-ink-500 mt-0.5 size-4 shrink-0" />
          Etsy is not answering right now, so the figures below are missing. Your connection is still in place.
        </p>
      )}

      <Card className="border-ink-200 bg-card gap-0 overflow-hidden py-0 shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 max-md:gap-3 max-md:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 max-md:gap-3">
            {shop.iconUrl ? (
              // Etsy-hosted shop icon; next/image would need the Etsy CDN whitelisted.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.iconUrl} alt="" className="ring-ink-200 size-14 shrink-0 rounded-xl object-cover ring-1 max-md:size-11" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#F1641E] text-white max-md:size-11"><Store className="size-7 max-md:size-5" /></span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-ink-900 truncate text-xl font-semibold max-md:text-lg">{shop.shopName}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${needsReconnect ? "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" : "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"}`}>
                  {needsReconnect ? "Reconnect needed" : "Connected"}
                </span>
                {shop.isOnVacation && <span className="bg-ink-100 text-ink-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">On vacation</span>}
              </div>
              {shop.title && <p className="text-ink-500 mt-0.5 truncate text-sm">{shop.title}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 self-start max-md:w-full max-md:self-stretch sm:items-end sm:self-center">
            <div className="flex gap-2 max-md:w-full">
              {canReadInsights && (
                <Button type="button" variant="outline" size="sm" className="max-md:flex-1 max-md:px-2" onClick={sync} disabled={syncing}>
                  <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} />{syncing ? "Syncing…" : "Sync now"}
                </Button>
              )}
              {shop.url && (
                <Button asChild variant="outline" size="sm" className="max-md:flex-1 max-md:px-2">
                  <a href={shop.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />View on Etsy</a>
                </Button>
              )}
            </div>
            {insightsQuery.data && <p className="text-ink-400 text-[11px]">Read from Etsy {timeAgo(insightsQuery.data.generatedAtUtc)}</p>}
          </div>
        </div>

        {/* Lifetime figures straight from Etsy's shop record; the panel below covers the last 30 days. */}
        <div className="border-ink-100 grid grid-cols-2 gap-3 border-t px-5 py-4 max-md:gap-2 max-md:p-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-ink-50 rounded-xl px-4 py-3 max-md:px-3 max-md:py-2.5">
              <p className="text-ink-500 flex items-center gap-1.5 text-xs font-semibold"><stat.icon className="size-3.5" />{stat.label}</p>
              <p className="text-ink-900 mt-1 text-2xl font-bold tabular-nums max-md:text-xl">{stat.value == null ? "—" : typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>
              {stat.hint && <p className="text-ink-500 text-[11px]">{stat.hint}</p>}
            </div>
          ))}
        </div>
      </Card>

      {canReadInsights && (
        insightsQuery.isPending ? (
          <Card className="border-ink-200 bg-card text-ink-500 flex min-h-40 items-center justify-center text-sm" role="status">
            <Loader2 className="mr-2 size-4 animate-spin" />Reading orders, listings and reviews from Etsy…
          </Card>
        ) : insightsQuery.isError || !insightsQuery.data ? (
          <Card className="border-ink-200 bg-card text-ink-600 flex min-h-32 flex-col items-center justify-center gap-3 text-sm">
            <p>Shop insights could not be loaded.</p>
            <Button type="button" variant="outline" size="sm" onClick={sync}><RefreshCw className="size-3.5" />Try again</Button>
          </Card>
        ) : (
          <ShopInsightsPanel insights={insightsQuery.data} />
        )
      )}

      <PrintifyCard />

      <Card className="border-ink-200 bg-card gap-0 overflow-hidden py-0 shadow-sm">
        <button
          type="button"
          aria-expanded={isDetailsOpen}
          className="text-ink-800 flex min-h-12 w-full items-center justify-between px-4 text-sm font-semibold md:hidden"
          onClick={() => setIsDetailsOpen((open) => !open)}
        >
          Connection details
          <ChevronDown className={cn("text-ink-400 size-4 transition-transform", isDetailsOpen && "rotate-180")} aria-hidden="true" />
        </button>
        <dl className={cn("border-ink-100 grid gap-x-6 gap-y-2 border-t px-5 py-4 text-sm max-md:grid-cols-2 max-md:px-4 sm:grid-cols-2 lg:grid-cols-4", !isDetailsOpen && "max-md:hidden")}>
          <Fact label="Shop ID" value={shop.shopId} />
          <Fact label="Currency" value={shop.currencyCode ?? "—"} />
          <Fact label="Connected since" value={formatDate(data.connectedAtUtc)} />
          <Fact label="Last synced" value={formatDate(data.lastSyncAtUtc)} />
        </dl>

        <div className="border-ink-100 bg-ink-50/60 flex flex-col gap-2 border-t px-5 py-3 max-md:px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("text-ink-500 text-xs", !isDetailsOpen && "max-md:hidden")}>
            {data.reconnectByUtc && !needsReconnect
              ? `Etsy asks you to confirm the connection again by ${formatDate(data.reconnectByUtc)}; Podivo renews access automatically until then.`
              : "Disconnecting removes the stored Etsy tokens from Podivo."}
          </p>
          {confirmDisconnect ? (
            <div className="flex shrink-0 items-center gap-2 max-md:flex-wrap">
              <span className="text-ink-700 text-xs font-medium">Disconnect this shop?</span>
              <Button type="button" size="sm" variant="outline" onClick={onCancelDisconnect} disabled={disconnecting}>Cancel</Button>
              <Button type="button" size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={onDisconnect} disabled={disconnecting}>
                {disconnecting && <Loader2 className="size-3.5 animate-spin" />}Disconnect
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" className="shrink-0 max-md:self-end" onClick={onAskDisconnect}><Unplug className="size-3.5" />Disconnect</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-500 text-xs">{label}</dt>
      <dd className="text-ink-800 truncate font-medium" title={value}>{value}</dd>
    </div>
  );
}
