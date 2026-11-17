"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TFunction } from "i18next";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Eye, Heart, Loader2, Package, PencilLine, Receipt, RefreshCw, ShieldCheck, ShoppingBag, Star, Store, Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { disconnectEtsy, type EtsyConnectionOutcome, getMyShop, getShopInsights, type MyShop } from "@/api/shop";
import { PageHeader } from "@/components/commons/layout/page-header";
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
const outcomeMessages: Record<EtsyConnectionOutcome, { messageKey: string; failed: boolean }> = {
  connected: { messageKey: "shop.page.outcomes.connected", failed: false },
  denied: { messageKey: "shop.page.outcomes.denied", failed: true },
  expired: { messageKey: "shop.page.outcomes.expired", failed: true },
  no_shop: { messageKey: "shop.page.outcomes.noShop", failed: true },
  shop_taken: { messageKey: "shop.page.outcomes.shopTaken", failed: true },
  failed: { messageKey: "shop.page.outcomes.failed", failed: true },
};

/** The permissions requested on Etsy's consent page, in the seller's terms. */
const permissions = [
  { icon: Store, titleKey: "shop.page.permissions.readShop.title", detailKey: "shop.page.permissions.readShop.detail" },
  { icon: Eye, titleKey: "shop.page.permissions.readListings.title", detailKey: "shop.page.permissions.readListings.detail" },
  { icon: Receipt, titleKey: "shop.page.permissions.readOrders.title", detailKey: "shop.page.permissions.readOrders.detail" },
  { icon: PencilLine, titleKey: "shop.page.permissions.createDrafts.title", detailKey: "shop.page.permissions.createDrafts.detail" },
];

const insightsKey = (userId?: string) => ["shop-insights", userId] as const;

const timeAgo = (iso: string, t: TFunction) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 1
    ? t("shop.page.timeJustNow")
    : minutes < 60
      ? t("shop.page.timeMinutesAgo", { count: minutes })
      : t("shop.page.timeHoursAgo", { count: Math.round(minutes / 60) });
};

const formatDate = (iso: string | null, locale: string) =>
  iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—";

export function ShopPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = useAuthStore((state) => state.user?.id);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [notice, setNotice] = useState<{ messageKey: string; failed: boolean } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const shopQuery = useQuery({ queryKey: shopKey(userId), queryFn: getMyShop, enabled: isHydrated && Boolean(userId) });

  const showOutcome = useCallback((outcome: EtsyConnectionOutcome) => {
    const message = outcomeMessages[outcome];
    setNotice(message);
    if (message.failed) toast.error(t(message.messageKey));
    else toast.success(t(message.messageKey));
    queryClient.invalidateQueries({ queryKey: shopKey(userId) });
  }, [queryClient, userId, t]);

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
      toast.success(t("shop.page.disconnectSuccess"));
      queryClient.invalidateQueries({ queryKey: shopKey(userId) });
    },
    onError: () => toast.error(t("shop.page.disconnectFailed")),
  });

  const data = shopQuery.data;
  // Called straight from the click, not through a mutation: the popup must open within the click or the browser blocks it.
  const connect = () => {
    etsyConnect.connect().catch(() => toast.error(t("shop.page.connectFailed")));
  };
  const connecting = etsyConnect.starting || etsyConnect.waiting;

  return (
    // The bottom padding keeps the last line clear of the floating assistant button.
    <div className="flex w-full min-w-0 flex-col gap-5 max-md:gap-3 max-md:pb-14 md:p-6">
      <PageHeader title={t("navigation.items.shop", { defaultValue: "Shop" })} className="max-md:sr-only" />
      {etsyConnect.waiting && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 sm:flex-row sm:items-center sm:justify-between dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300" role="status">
          <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{t("shop.page.waitingPopup")}</span>
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={etsyConnect.focusPopup}>{t("shop.page.showEtsyWindow")}</Button>
        </div>
      )}
      {notice && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.failed ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"}`} role="status">
          {notice.failed ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>{t(notice.messageKey)}</span>
        </div>
      )}

      {!isHydrated || shopQuery.isPending ? (
        <Card className="border-ink-200 bg-card text-ink-500 flex min-h-64 items-center justify-center text-sm" role="status">
          <Loader2 className="mr-2 size-4 animate-spin" />{t("shop.page.loadingShop")}
        </Card>
      ) : shopQuery.isError || !data ? (
        <Card className="border-ink-200 bg-card text-ink-600 flex min-h-40 flex-col items-center justify-center gap-3 text-sm">
          <p>{t("shop.page.loadError")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => shopQuery.refetch()}><RefreshCw className="size-3.5" />{t("shop.page.tryAgain")}</Button>
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
        {t("shop.page.etsyTrademark")}
      </p>
    </div>
  );
}

/** Shown until a shop is connected: the seller connects Etsy before anything else here. */
function ConnectGate({ data, connecting, onConnect }: { data: MyShop; connecting: boolean; onConnect: () => void }) {
  const { t } = useTranslation("common");
  return (
    <Card className="border-ink-200 bg-card mx-auto w-full max-w-2xl gap-0 overflow-hidden py-0 shadow-sm">
      <div className="to-card flex flex-col items-center gap-3 bg-gradient-to-b from-orange-50 px-6 pt-8 pb-6 text-center dark:from-orange-500/10">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#F1641E] text-white shadow-md"><ShoppingBag className="size-7" /></span>
        <h2 className="text-ink-900 text-xl font-semibold">{t("shop.page.connectTitle")}</h2>
        <p className="text-ink-600 max-w-md text-sm leading-6">
          {t("shop.page.connectDescription")}
        </p>
      </div>
      <ul className="divide-ink-100 border-ink-100 divide-y border-y">
        {permissions.map((item) => (
          <li key={item.titleKey} className="flex items-start gap-3 px-6 py-3">
            <span className="bg-ink-100 text-ink-600 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"><item.icon className="size-4" /></span>
            <div>
              <p className="text-ink-900 text-sm font-semibold">{t(item.titleKey)}</p>
              <p className="text-ink-500 text-xs leading-5">{t(item.detailKey)}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-2 px-6 py-5">
        {data.etsyConfigured ? (
          <Button type="button" className="h-11 w-full max-w-xs bg-[#F1641E] text-white hover:bg-[#d9561a]" onClick={onConnect} disabled={connecting}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4" />}
            {connecting ? t("shop.page.waitingForEtsy") : t("shop.page.connectWithEtsy")}
          </Button>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">{t("shop.page.notConfigured")}</p>
        )}
        <p className="text-ink-500 flex items-center gap-1.5 text-[11px]"><ShieldCheck className="size-3.5" />{t("shop.page.tokensNote")}</p>
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
  const { t, i18n } = useTranslation("common");
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
    onError: () => toast.error(t("shop.page.syncFailed")),
  });
  const sync = () => syncMutation.mutate();
  const syncing = syncMutation.isPending;
  const stats = [
    { icon: Package, label: t("shop.page.statActiveListings"), value: shop.activeListingCount },
    { icon: ShoppingBag, label: t("shop.page.statAllTimeSales"), value: shop.soldCount },
    { icon: Heart, label: t("shop.page.statShopFavorites"), value: shop.favorerCount },
    {
      icon: Star,
      label: t("shop.page.statRating"),
      value: shop.reviewAverage == null || hasNoReviews ? null : `${shop.reviewAverage.toFixed(1)} / 5`,
      hint: hasNoReviews ? t("shop.page.noReviewsYet") : shop.reviewCount == null ? undefined : t("shop.page.reviewsCount", { count: shop.reviewCount }),
    },
  ];

  return (
    <div className="flex flex-col gap-4 max-md:gap-3">
      {needsReconnect && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {t("shop.page.reconnectBanner")}
          </p>
          <Button type="button" size="sm" className="shrink-0 bg-[#F1641E] text-white hover:bg-[#d9561a]" onClick={onReconnect} disabled={connecting}>
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}{t("shop.page.reconnectEtsy")}
          </Button>
        </div>
      )}
      {data.status === "unavailable" && (
        <p className="border-ink-200 bg-ink-50 text-ink-700 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
          <AlertTriangle className="text-ink-500 mt-0.5 size-4 shrink-0" />
          {t("shop.page.etsyUnavailable")}
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
                  {needsReconnect ? t("shop.page.reconnectNeeded") : t("shop.page.connected")}
                </span>
                {shop.isOnVacation && <span className="bg-ink-100 text-ink-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">{t("shop.page.onVacation")}</span>}
              </div>
              {shop.title && <p className="text-ink-500 mt-0.5 truncate text-sm">{shop.title}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 self-start max-md:w-full max-md:self-stretch sm:items-end sm:self-center">
            <div className="flex gap-2 max-md:w-full">
              {canReadInsights && (
                <Button type="button" variant="outline" size="sm" className="max-md:flex-1 max-md:px-2" onClick={sync} disabled={syncing}>
                  <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} />{syncing ? t("shop.page.syncing") : t("shop.page.syncNow")}
                </Button>
              )}
              {shop.url && (
                <Button asChild variant="outline" size="sm" className="max-md:flex-1 max-md:px-2">
                  <a href={shop.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />{t("shop.page.viewOnEtsy")}</a>
                </Button>
              )}
            </div>
            {insightsQuery.data && <p className="text-ink-400 text-[11px]">{t("shop.page.readFromEtsy", { time: timeAgo(insightsQuery.data.generatedAtUtc, t) })}</p>}
          </div>
        </div>

        {/* Lifetime figures straight from Etsy's shop record; the panel below covers the last 30 days. */}
        <div className="border-ink-100 grid grid-cols-2 gap-3 border-t px-5 py-4 max-md:gap-2 max-md:p-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-ink-50 rounded-xl px-4 py-3 max-md:px-3 max-md:py-2.5">
              <p className="text-ink-500 flex items-center gap-1.5 text-xs font-semibold"><stat.icon className="size-3.5" />{stat.label}</p>
              <p className="text-ink-900 mt-1 text-2xl font-bold tabular-nums max-md:text-xl">{stat.value == null ? "—" : typeof stat.value === "number" ? stat.value.toLocaleString(i18n.language) : stat.value}</p>
              {stat.hint && <p className="text-ink-500 text-[11px]">{stat.hint}</p>}
            </div>
          ))}
        </div>
      </Card>

      {canReadInsights && (
        insightsQuery.isPending ? (
          <Card className="border-ink-200 bg-card text-ink-500 flex min-h-40 items-center justify-center text-sm" role="status">
            <Loader2 className="mr-2 size-4 animate-spin" />{t("shop.page.readingInsights")}
          </Card>
        ) : insightsQuery.isError || !insightsQuery.data ? (
          <Card className="border-ink-200 bg-card text-ink-600 flex min-h-32 flex-col items-center justify-center gap-3 text-sm">
            <p>{t("shop.page.insightsLoadError")}</p>
            <Button type="button" variant="outline" size="sm" onClick={sync}><RefreshCw className="size-3.5" />{t("shop.page.tryAgain")}</Button>
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
          {t("shop.page.connectionDetails")}
          <ChevronDown className={cn("text-ink-400 size-4 transition-transform", isDetailsOpen && "rotate-180")} aria-hidden="true" />
        </button>
        <dl className={cn("border-ink-100 grid gap-x-6 gap-y-2 border-t px-5 py-4 text-sm max-md:grid-cols-2 max-md:px-4 sm:grid-cols-2 lg:grid-cols-4", !isDetailsOpen && "max-md:hidden")}>
          <Fact label={t("shop.page.factShopId")} value={shop.shopId} />
          <Fact label={t("shop.page.factCurrency")} value={shop.currencyCode ?? "—"} />
          <Fact label={t("shop.page.factConnectedSince")} value={formatDate(data.connectedAtUtc, i18n.language)} />
          <Fact label={t("shop.page.factLastSynced")} value={formatDate(data.lastSyncAtUtc, i18n.language)} />
        </dl>

        <div className="border-ink-100 bg-ink-50/60 flex flex-col gap-2 border-t px-5 py-3 max-md:px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("text-ink-500 text-xs", !isDetailsOpen && "max-md:hidden")}>
            {data.reconnectByUtc && !needsReconnect
              ? t("shop.page.reconnectBy", { date: formatDate(data.reconnectByUtc, i18n.language) })
              : t("shop.page.disconnectNote")}
          </p>
          {confirmDisconnect ? (
            <div className="flex shrink-0 items-center gap-2 max-md:flex-wrap">
              <span className="text-ink-700 text-xs font-medium">{t("shop.page.disconnectConfirm")}</span>
              <Button type="button" size="sm" variant="outline" onClick={onCancelDisconnect} disabled={disconnecting}>{t("shop.page.cancel")}</Button>
              <Button type="button" size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={onDisconnect} disabled={disconnecting}>
                {disconnecting && <Loader2 className="size-3.5 animate-spin" />}{t("shop.page.disconnect")}
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" className="shrink-0 max-md:self-end" onClick={onAskDisconnect}><Unplug className="size-3.5" />{t("shop.page.disconnect")}</Button>
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
