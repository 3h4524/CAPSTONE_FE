"use client";


import { useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Clock, Globe2, Heart, Image as ImageIcon, Package, Star, Tag, Timer, TrendingUp, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ListingIssue, OrderInsights, ShopInsights, ShopListingRow } from "@/api/shop";
import { Card } from "@/components/ui/card";
import { useIsPhone } from "@/hooks/use-is-phone";
import { i18n } from "@/i18n/client";
import { cn } from "@/utils/cn";

const money = (value: number | null | undefined, currency: string | null) =>
  value == null ? "—" : new Intl.NumberFormat(i18n.language, { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 2 }).format(value);

const percentChange = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

const issueLabel = (issue: ListingIssue) => ({
  label: i18n.t(`shop.insights.issues.${issue}.label`),
  hint: i18n.t(`shop.insights.issues.${issue}.hint`),
});

const shortDate = (value: string) => new Date(value).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });

// A phone lists the latest few; the rest open on request.
const PHONE_LISTINGS = 5;

const LISTING_STATES = ["active", "draft", "inactive", "sold_out", "expired"];

/** Section names the backend reports when Etsy could not answer them. */
const SECTION_KEYS = ["listings", "orders", "reviews", "setup"];

export function ShopInsightsPanel({ insights }: { insights: ShopInsights }) {
  const { t } = useTranslation("common");
  const currency = insights.currency;
  return (
    // On a phone the grids open up and these orders apply: what needs doing comes first.
    <div className="flex flex-col gap-4 max-md:gap-3">
      {insights.unavailableSections.length > 0 && (
        <p className="border-ink-200 bg-ink-50 text-ink-700 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
          <AlertTriangle className="text-ink-500 mt-0.5 size-4 shrink-0" />
          {t("shop.insights.unavailable", {
            sections: insights.unavailableSections
              .map((section) => (SECTION_KEYS.includes(section) ? t(`shop.insights.sections.${section}`) : section))
              .join(", "),
          })}
        </p>
      )}
      <KpiRow insights={insights} className="max-md:order-2" />
      <div className="grid gap-4 max-md:contents xl:grid-cols-3">
        <OrdersChart orders={insights.orders} currency={currency} className="max-md:order-4" />
        <Attention insights={insights} className="max-md:order-1" />
      </div>
      {insights.listings && <ListingsCard insights={insights} className="max-md:order-3" />}
      <div className="grid gap-4 max-md:contents lg:grid-cols-2">
        <BestSellers orders={insights.orders} currency={currency} className="max-md:order-5" />
        <ReviewsCard insights={insights} className="max-md:order-6" />
      </div>
    </div>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  const { t } = useTranslation("common");
  const change = percentChange(current, previous);
  if (change == null) return <span className="text-ink-400 text-[11px]">{t("shop.insights.noEarlierData")}</span>;
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`}>
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{t("shop.insights.vsPrevious", { change: Math.abs(change) })}
    </span>
  );
}

function Kpi({ label, value, footer, icon: Icon, className }: { label: React.ReactNode; value: string; footer: React.ReactNode; icon: typeof Package; className?: string }) {
  return (
    <div className={cn("border-ink-200 bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-xs max-md:gap-1 max-md:p-3.5", className)}>
      {/* The label sits in one span: as loose flex children, "Revenue" and ", last 30 days" got the gap between them. */}
      <p className="text-ink-500 flex items-center gap-1.5 text-xs font-semibold"><Icon className="size-3.5 shrink-0" /><span>{label}</span></p>
      <p className="text-ink-900 truncate text-2xl font-bold tabular-nums max-md:text-xl">{value}</p>
      <div className="text-ink-500 mt-auto text-[11px]">{footer}</div>
    </div>
  );
}

function KpiRow({ insights, className }: { insights: ShopInsights; className?: string }) {
  const { t } = useTranslation("common");
  const orders = insights.orders;
  const counts = insights.listings?.countsByState;
  const feeShare = orders?.fees != null && orders.net != null && orders.fees + orders.net > 0 ? Math.round((orders.fees / (orders.fees + orders.net)) * 100) : null;
  return (
    <div className={cn("grid grid-cols-2 gap-3 max-md:gap-2 lg:grid-cols-4", className)}>
      <Kpi icon={TrendingUp} label={<>{t("shop.insights.revenue")}<span className="max-md:hidden">{t("shop.insights.last30Suffix")}</span><span className="md:hidden">{t("shop.insights.short30Suffix")}</span></>} value={orders ? money(orders.revenue, insights.currency) : "—"}
        footer={orders ? <Change current={orders.revenue} previous={orders.previousRevenue} /> : t("shop.insights.ordersUnavailable")} />
      <Kpi icon={Package} label={<>{t("shop.insights.orders")}<span className="max-md:hidden">{t("shop.insights.last30Suffix")}</span><span className="md:hidden">{t("shop.insights.short30Suffix")}</span></>} value={orders ? orders.orders.toLocaleString(i18n.language) : "—"}
        footer={orders ? <Change current={orders.orders} previous={orders.previousOrders} /> : t("shop.insights.ordersUnavailable")} />
      <Kpi icon={Check} label={t("shop.insights.received")} className={orders?.net != null ? "max-md:col-span-2" : "max-md:hidden"} value={orders?.net != null ? money(orders.net, insights.currency) : "—"}
        footer={orders?.net != null
          ? `${t("shop.insights.fees", { amount: money(orders.fees, insights.currency) })}${feeShare != null ? ` (${feeShare}%)` : ""} · ${t("shop.insights.feeSample", { sample: orders.feeSampleOrders, total: orders.orders })}`
          : t("shop.insights.shownOncePaid")} />
      <Kpi icon={Tag} label={t("shop.insights.activeListings")} className="max-md:hidden" value={counts ? (counts.active ?? 0).toLocaleString(i18n.language) : "—"}
        footer={counts ? t("shop.insights.listingCounts", { draft: counts.draft ?? 0, soldOut: counts.sold_out ?? 0, expired: counts.expired ?? 0 }) : t("shop.insights.listingsUnavailable")} />
    </div>
  );
}

function OrdersChart({ orders, currency, className }: { orders: OrderInsights | null; currency: string | null; className?: string }) {
  const { t } = useTranslation("common");
  const peak = Math.max(1, ...(orders?.daily.map((day) => day.orders) ?? [0]));
  return (
    <Card className={cn("border-ink-200 bg-card gap-0 py-0 shadow-sm xl:col-span-2", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 max-md:px-4 max-md:pt-4">
        <div>
          <h3 className="text-ink-900 text-sm font-semibold">{t("shop.insights.ordersPerDay")}</h3>
          <p className="text-ink-500 text-xs max-md:hidden">{orders?.truncated ? t("shop.insights.ordersPerDayTruncated") : t("shop.insights.ordersPerDayHint")}</p>
        </div>
        {orders && orders.orders > 0 && <p className="text-ink-500 text-right text-xs">{t("shop.insights.averageOrder")}<br /><span className="text-ink-900 text-sm font-semibold">{money(orders.averageOrderValue, currency)}</span></p>}
      </div>
      {!orders ? (
        <p className="text-ink-400 px-5 py-10 text-center text-sm max-md:px-4 max-md:pt-1 max-md:pb-4 max-md:text-left max-md:text-xs">{t("shop.insights.ordersReadError")}</p>
      ) : orders.orders === 0 ? (
        <p className="text-ink-400 px-5 py-10 text-center text-sm max-md:px-4 max-md:pt-1 max-md:pb-4 max-md:text-left max-md:text-xs">{t("shop.insights.noOrders")}</p>
      ) : (
        <div className="px-5 pt-4 pb-5 max-md:px-4 max-md:pb-4">
          <div className="flex h-36 items-end gap-1" role="img" aria-label={t("shop.insights.chartLabel")}>
            {orders.daily.map((day) => (
              <div key={day.day} className="group relative flex h-full flex-1 items-end">
                <div className={`w-full rounded-t ${day.orders > 0 ? "bg-ink-800 group-hover:bg-[#F1641E]" : "bg-ink-100"}`} style={{ height: `${Math.max(day.orders > 0 ? 6 : 2, (day.orders / peak) * 100)}%` }} />
                <span className="bg-ink-900 text-card pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded px-2 py-1 text-[11px] whitespace-nowrap group-hover:block">
                  {shortDate(day.day)}: {t("shop.insights.dayOrders", { count: day.orders })}, {money(day.revenue, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="text-ink-400 mt-1 flex justify-between text-[11px]">
            <span>{shortDate(orders.daily[0].day)}</span>
            <span>{t("shop.insights.today")}</span>
          </div>
          <p className="border-ink-100 text-ink-600 mt-3 border-t pt-3 text-xs">{t("shop.insights.itemsSold", { count: orders.itemsSold })} · {t("shop.insights.dayOrders", { count: orders.orders })}</p>
        </div>
      )}
    </Card>
  );
}

function AttentionRow({ icon: Icon, label, value, tone, hint, isQuiet }: { icon: typeof Truck; label: string; value: string; tone: "warn" | "ok" | "neutral"; hint?: string; isQuiet?: boolean }) {
  const color = tone === "warn" ? "text-amber-700 dark:text-amber-300" : tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-ink-900";
  return (
    <li className={cn("flex items-center justify-between gap-3 py-2.5", (tone === "ok" || isQuiet) && "max-md:hidden")} title={hint}>
      <span className="text-ink-600 flex items-center gap-2 text-sm"><Icon className="text-ink-400 size-4" />{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </li>
  );
}

function Attention({ insights, className }: { insights: ShopInsights; className?: string }) {
  const { t } = useTranslation("common");
  const orders = insights.orders;
  const issues = insights.listings?.issues;
  const hasWork = Boolean(
    orders && (orders.awaitingShipment > 0 || orders.lateShipments > 0 || orders.refundedOrders > 0) ||
    issues && (issues.lowStock > 0 || issues.expiring > 0)
  );
  return (
    <Card className={cn("border-ink-200 bg-card gap-0 py-0 shadow-sm", className)}>
      <div className="px-5 pt-5 max-md:px-4 max-md:pt-4">
        <h3 className="text-ink-900 text-sm font-semibold">{t("shop.insights.needsAttention")}</h3>
        <p className="text-ink-500 text-xs max-md:hidden">{t("shop.insights.actToday")}</p>
      </div>
      {/* A phone lists only what needs doing, or says there is nothing. */}
      {(orders || issues) && !hasWork && (
        <p className="flex items-center gap-1.5 px-4 pt-1 pb-4 text-xs font-medium text-emerald-700 md:hidden dark:text-emerald-300">
          <Check className="size-3.5" aria-hidden="true" />{t("shop.insights.allClear")}
        </p>
      )}
      <ul className="divide-ink-100 divide-y px-5 pb-3 max-md:px-4 max-md:pb-1">
        {orders && (
          <>
            <AttentionRow icon={Truck} label={t("shop.insights.paidNotShipped")} value={String(orders.awaitingShipment)} tone={orders.awaitingShipment > 0 ? "warn" : "ok"} />
            <AttentionRow icon={AlertTriangle} label={t("shop.insights.pastShipDate")} value={String(orders.lateShipments)} tone={orders.lateShipments > 0 ? "warn" : "ok"} />
            <AttentionRow icon={Timer} label={t("shop.insights.averageShipTime")} tone="neutral" isQuiet={orders.averageFulfillmentHours == null || !hasWork}
              value={orders.averageFulfillmentHours == null ? "—" : orders.averageFulfillmentHours >= 48 ? t("shop.insights.days", { value: (orders.averageFulfillmentHours / 24).toFixed(1) }) : t("shop.insights.hours", { value: Math.round(orders.averageFulfillmentHours) })}
              hint={t("shop.insights.shipTimeHint", { count: orders.fulfillmentSampleSize })} />
            <AttentionRow icon={ArrowDownRight} label={t("shop.insights.refunds")} value={orders.refundedOrders === 0 ? "0" : `${orders.refundedOrders} · ${money(orders.refunded, insights.currency)}`} tone={orders.refundedOrders > 0 ? "warn" : "ok"} />
          </>
        )}
        {issues && (
          <>
            <AttentionRow icon={Package} label={t("shop.insights.lowStockListings")} value={String(issues.lowStock)} tone={issues.lowStock > 0 ? "warn" : "ok"} />
            <AttentionRow icon={Clock} label={t("shop.insights.expiringListings")} value={String(issues.expiring)} tone={issues.expiring > 0 ? "warn" : "ok"} />
          </>
        )}
        {!orders && !issues && <li className="text-ink-400 py-6 text-center text-sm">{t("shop.insights.nothingRead")}</li>}
      </ul>
    </Card>
  );
}

function ListingsCard({ insights, className }: { insights: ShopInsights; className?: string }) {
  const { t } = useTranslation("common");
  const listings = insights.listings!;
  const isPhone = useIsPhone();
  const [showsAll, setShowsAll] = useState(false);
  const allRows = listings.recent.slice(0, 12);
  const rows = isPhone && !showsAll ? allRows.slice(0, PHONE_LISTINGS) : allRows;
  const issueCounts = [
    { key: "few_tags" as const, count: listings.issues.fewTags },
    { key: "few_photos" as const, count: listings.issues.fewPhotos },
    { key: "viewed_not_favorited" as const, count: listings.issues.viewedNotFavorited },
    { key: "low_stock" as const, count: listings.issues.lowStock },
    { key: "expiring" as const, count: listings.issues.expiring },
  ].filter((item) => item.count > 0);

  return (
    <Card className={cn("border-ink-200 bg-card gap-0 py-0 shadow-sm", className)}>
      <div className="flex flex-col gap-3 px-5 pt-5 max-md:gap-2 max-md:px-4 max-md:pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-ink-900 text-sm font-semibold">{t("shop.insights.listings")}</h3>
          <p className="text-ink-500 text-xs max-md:hidden">{t("shop.insights.listingsHint", { count: listings.recent.length })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_STATES.map((state) => [state, t(`shop.insights.states.${state}`)]).map(([state, label]) => (
            <span key={state} className={cn("bg-ink-100 text-ink-700 rounded-full px-2.5 py-1 text-xs", !listings.countsByState[state] && "max-md:hidden")}>{label} <span className="font-semibold tabular-nums">{listings.countsByState[state] ?? 0}</span></span>
          ))}
        </div>
      </div>
      {issueCounts.length > 0 && (
        <div className={cn("mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 max-md:mx-4 dark:bg-amber-500/10 dark:text-amber-300", listings.recent.length <= 1 && "max-md:hidden")}>
          <AlertTriangle className="size-3.5" />
          {issueCounts.map((item) => <span key={item.key} title={issueLabel(item.key).hint}><span className="font-semibold">{item.count}</span> {issueLabel(item.key).label.toLowerCase()}</span>)}
          <span className="text-amber-700 dark:text-amber-300">{t("shop.insights.ofChecked", { count: listings.issues.checked })}</span>
        </div>
      )}
      {listings.recent.length === 0 ? (
        <p className="text-ink-400 px-5 py-10 text-center text-sm max-md:px-4 max-md:pt-1 max-md:pb-4 max-md:text-left max-md:text-xs">{t("shop.insights.noListings")}</p>
      ) : (
        <ul className="divide-ink-100 border-ink-100 mt-3 divide-y border-t">
          {rows.map((listing) => <ListingRow key={listing.listingId} listing={listing} currency={insights.currency} />)}
        </ul>
      )}
      {isPhone && allRows.length > PHONE_LISTINGS && (
        <button
          type="button"
          className="border-ink-100 text-ink-700 min-h-11 w-full border-t text-xs font-semibold"
          onClick={() => setShowsAll((value) => !value)}
        >
          {showsAll ? t("shop.insights.showFewer") : t("shop.insights.showAll", { count: allRows.length })}
        </button>
      )}
    </Card>
  );
}

function ListingRow({ listing, currency }: { listing: ShopListingRow; currency: string | null }) {
  const { t } = useTranslation("common");
  return (
    <li className="flex flex-col gap-2 px-5 py-3 max-md:px-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {listing.imageUrl ? (
          // Etsy-hosted image; next/image would need the Etsy CDN whitelisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt="" className="ring-ink-200 size-12 shrink-0 rounded-lg object-cover ring-1" />
        ) : (
          <span className="bg-ink-100 text-ink-400 flex size-12 shrink-0 items-center justify-center rounded-lg"><ImageIcon className="size-5" /></span>
        )}
        <div className="min-w-0">
          {listing.url
            ? <a href={listing.url} target="_blank" rel="noreferrer" className="text-ink-900 block truncate text-sm font-medium hover:text-[#F1641E] hover:underline" title={listing.title}>{listing.title}</a>
            : <p className="text-ink-900 truncate text-sm font-medium" title={listing.title}>{listing.title}</p>}
          <p className="text-ink-500 mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums">
            <span>{money(listing.price, listing.currency ?? currency)}</span>
            <span className={listing.issues.includes("low_stock") ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{t("shop.insights.stock", { count: listing.quantity })}</span>
            <span>{t("shop.insights.views", { count: listing.views })}</span>
            <span><Heart className="inline size-3" /> {listing.favorites}</span>
            <span>{t("shop.insights.tags", { count: listing.tagCount })}</span>
            <span>{t("shop.insights.photos", { count: listing.imageCount })}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 sm:max-w-80 sm:justify-end">
        {listing.issues.length === 0
          ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{t("shop.insights.looksGood")}</span>
          : listing.issues.map((issue) => <span key={issue} title={issueLabel(issue).hint} className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">{issueLabel(issue).label}</span>)}
      </div>
    </li>
  );
}

function BestSellers({ orders, currency, className }: { orders: OrderInsights | null; currency: string | null; className?: string }) {
  const { t } = useTranslation("common");
  const peak = Math.max(1, ...(orders?.topListings.map((item) => item.revenue) ?? [0]));
  return (
    <Card className={cn("border-ink-200 bg-card gap-0 py-0 shadow-sm", className)}>
      <div className="px-5 pt-5 max-md:px-4 max-md:pt-4">
        <h3 className="text-ink-900 text-sm font-semibold">{t("shop.insights.bestSellers")}</h3>
        <p className="text-ink-500 text-xs max-md:hidden">{t("shop.insights.bestSellersHint")}</p>
      </div>
      {!orders || orders.topListings.length === 0 ? (
        <p className="text-ink-400 px-5 py-10 text-center text-sm max-md:px-4 max-md:pt-1 max-md:pb-4 max-md:text-left max-md:text-xs">{t("shop.insights.noSales")}</p>
      ) : (
        <div className="space-y-4 px-5 py-4 max-md:px-4">
          <ul className="space-y-2">
            {orders.topListings.map((item) => (
              <li key={item.listingId ?? item.title} className="text-xs">
                <div className="flex justify-between gap-3"><span className="text-ink-800 truncate" title={item.title}>{item.title}</span><span className="text-ink-900 shrink-0 font-semibold tabular-nums">{money(item.revenue, currency)}</span></div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="bg-ink-100 h-1.5 flex-1 rounded-full"><span className="block h-1.5 rounded-full bg-[#F1641E]" style={{ width: `${(item.revenue / peak) * 100}%` }} /></span>
                  <span className="text-ink-500 w-14 text-right text-[11px] tabular-nums">{t("shop.insights.unitsSold", { count: item.units })}</span>
                </div>
              </li>
            ))}
          </ul>
          {orders.topCountries.length > 0 && (
            <div className="border-ink-100 flex flex-wrap items-center gap-1.5 border-t pt-3 text-xs">
              <Globe2 className="text-ink-400 size-3.5" />
              {orders.topCountries.map((country) => <span key={country.countryIso} className="bg-ink-100 text-ink-700 rounded-full px-2 py-0.5">{country.countryIso} · {country.orders}</span>)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ReviewsCard({ insights, className }: { insights: ShopInsights; className?: string }) {
  const { t, i18n: i18next } = useTranslation("common");
  const reviews = insights.reviews;
  const peak = Math.max(1, ...Object.values(reviews?.distribution ?? {}));
  return (
    <Card className={cn("border-ink-200 bg-card gap-0 py-0 shadow-sm", className)}>
      <div className="px-5 pt-5 max-md:px-4 max-md:pt-4">
        <h3 className="text-ink-900 text-sm font-semibold">{t("shop.insights.reviews")}</h3>
        <p className={cn("text-ink-500 text-xs", (!reviews || reviews.sampled === 0) && "max-md:hidden")}>{reviews ? t("shop.insights.reviewsSample", { count: reviews.sampled }) : t("shop.insights.reviewsReadError")}</p>
      </div>
      {!reviews || reviews.sampled === 0 ? (
        <p className="text-ink-400 px-5 py-10 text-center text-sm max-md:px-4 max-md:pt-1 max-md:pb-4 max-md:text-left max-md:text-xs">{t("shop.insights.noReviews")}</p>
      ) : (
        <div className="grid gap-4 px-5 py-4 max-md:px-4 sm:grid-cols-[8rem_1fr]">
          <div>
            <p className="text-ink-900 flex items-center gap-1 text-3xl font-bold tabular-nums">{reviews.average?.toFixed(1)}<Star className="size-5 fill-amber-400 text-amber-400" /></p>
            <div className="mt-2 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="text-ink-500 flex items-center gap-1.5 text-[11px]">
                  <span className="w-3 tabular-nums">{star}</span>
                  <span className="bg-ink-100 h-1.5 flex-1 rounded-full"><span className={`block h-1.5 rounded-full ${star >= 4 ? "bg-amber-400" : "bg-ink-400"}`} style={{ width: `${((reviews.distribution[star] ?? 0) / peak) * 100}%` }} /></span>
                  <span className="w-5 text-right tabular-nums">{reviews.distribution[star] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {reviews.recent.map((review, index) => (
              <li key={`${review.createdAtUtc}-${index}`} className="bg-ink-50 rounded-lg px-3 py-2 text-xs">
                <p className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: 5 }, (_, star) => <Star key={star} className={`size-3 ${star < review.rating ? "fill-amber-400" : "text-ink-300"}`} />)}
                  {review.createdAtUtc && <span className="text-ink-400 ml-2">{new Date(review.createdAtUtc).toLocaleDateString(i18next.language)}</span>}</p>
                <p className="text-ink-700 mt-1 line-clamp-2">{review.text ?? t("shop.insights.noComment")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
