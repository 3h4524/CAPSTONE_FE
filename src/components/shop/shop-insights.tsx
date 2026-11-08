"use client";


import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Clock, Globe2, Heart, Image as ImageIcon, Package, Star, Tag, Timer, TrendingUp, Truck } from "lucide-react";

import type { ListingIssue, OrderInsights, ShopInsights, ShopListingRow } from "@/api/shop";
import { Card } from "@/components/ui/card";

const money = (value: number | null | undefined, currency: string | null) =>
  value == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 2 }).format(value);

const percentChange = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

const issueLabel: Record<ListingIssue, { label: string; hint: string }> = {
  low_stock: { label: "Low stock", hint: "3 or fewer left" },
  expiring: { label: "Expiring", hint: "Ends within 14 days; renew to stay listed" },
  few_tags: { label: "Unused tags", hint: "Fewer than 13 tags leaves search terms unused" },
  few_photos: { label: "Few photos", hint: "Fewer than 5 photos" },
  viewed_not_favorited: { label: "Views, no favorites", hint: "40+ views and no favorite: check photos, price or title" },
};

const stateLabels: Record<string, string> = { active: "Active", draft: "Draft", inactive: "Inactive", sold_out: "Sold out", expired: "Expired" };

/** Section names the backend reports when Etsy could not answer them. */
const sectionLabels: Record<string, string> = { listings: "listings", orders: "orders", reviews: "reviews", setup: "shop setup" };

export function ShopInsightsPanel({ insights }: { insights: ShopInsights }) {
  const currency = insights.currency;
  return (
    <div className="flex flex-col gap-4">
      {insights.unavailableSections.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-slate-500" />
          Etsy did not answer for {insights.unavailableSections.map((section) => sectionLabels[section] ?? section).join(", ")} this time. Use Sync now to try again.
        </p>
      )}
      <KpiRow insights={insights} />
      <div className="grid gap-4 xl:grid-cols-3">
        <OrdersChart orders={insights.orders} currency={currency} />
        <Attention insights={insights} />
      </div>
      {insights.listings && <ListingsCard insights={insights} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <BestSellers orders={insights.orders} currency={currency} />
        <ReviewsCard insights={insights} />
      </div>
    </div>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change == null) return <span className="text-[11px] text-slate-400">no earlier data</span>;
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(change)}% vs previous 30 days
    </span>
  );
}

function Kpi({ label, value, footer, icon: Icon }: { label: string; value: string; footer: React.ReactNode; icon: typeof Package }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Icon className="size-3.5" />{label}</p>
      <p className="truncate text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <div className="mt-auto text-[11px] text-slate-500">{footer}</div>
    </div>
  );
}

function KpiRow({ insights }: { insights: ShopInsights }) {
  const orders = insights.orders;
  const counts = insights.listings?.countsByState;
  const feeShare = orders?.fees != null && orders.net != null && orders.fees + orders.net > 0 ? Math.round((orders.fees / (orders.fees + orders.net)) * 100) : null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={TrendingUp} label="Revenue, last 30 days" value={orders ? money(orders.revenue, insights.currency) : "—"}
        footer={orders ? <Change current={orders.revenue} previous={orders.previousRevenue} /> : "Orders unavailable"} />
      <Kpi icon={Package} label="Orders, last 30 days" value={orders ? orders.orders.toLocaleString() : "—"}
        footer={orders ? <Change current={orders.orders} previous={orders.previousOrders} /> : "Orders unavailable"} />
      <Kpi icon={Check} label="Received after Etsy fees" value={orders?.net != null ? money(orders.net, insights.currency) : "—"}
        footer={orders?.net != null
          ? `Fees ${money(orders.fees, insights.currency)}${feeShare != null ? ` (${feeShare}%)` : ""} · from ${orders.feeSampleOrders} of ${orders.orders} orders`
          : "Shown once a paid order exists"} />
      <Kpi icon={Tag} label="Active listings" value={counts ? (counts.active ?? 0).toLocaleString() : "—"}
        footer={counts ? `${counts.draft ?? 0} draft · ${counts.sold_out ?? 0} sold out · ${counts.expired ?? 0} expired` : "Listings unavailable"} />
    </div>
  );
}

function OrdersChart({ orders, currency }: { orders: OrderInsights | null; currency: string | null }) {
  const peak = Math.max(1, ...(orders?.daily.map((day) => day.orders) ?? [0]));
  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm xl:col-span-2">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Orders per day</h3>
          <p className="text-xs text-slate-500">Last 30 days, canceled orders left out{orders?.truncated ? "; only the newest 500 orders were read" : ""}.</p>
        </div>
        {orders && <p className="text-right text-xs text-slate-500">Average order<br /><span className="text-sm font-semibold text-slate-900">{money(orders.averageOrderValue, currency)}</span></p>}
      </div>
      {!orders ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">Orders could not be read.</p>
      ) : orders.orders === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No orders in the last 30 days yet.</p>
      ) : (
        <div className="px-5 pt-4 pb-5">
          <div className="flex h-36 items-end gap-1" role="img" aria-label="Orders per day over the last 30 days">
            {orders.daily.map((day) => (
              <div key={day.day} className="group relative flex h-full flex-1 items-end">
                <div className={`w-full rounded-t ${day.orders > 0 ? "bg-slate-800 group-hover:bg-[#F1641E]" : "bg-slate-100"}`} style={{ height: `${Math.max(day.orders > 0 ? 6 : 2, (day.orders / peak) * 100)}%` }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                  {new Date(day.day).toLocaleDateString(undefined, { day: "numeric", month: "short" })}: {day.orders} order(s), {money(day.revenue, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>{new Date(orders.daily[0].day).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
            <span>Today</span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">{orders.itemsSold} item(s) sold · {orders.orders} order(s)</p>
        </div>
      )}
    </Card>
  );
}

function AttentionRow({ icon: Icon, label, value, tone, hint }: { icon: typeof Truck; label: string; value: string; tone: "warn" | "ok" | "neutral"; hint?: string }) {
  const color = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-slate-900";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5" title={hint}>
      <span className="flex items-center gap-2 text-sm text-slate-600"><Icon className="size-4 text-slate-400" />{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </li>
  );
}

function Attention({ insights }: { insights: ShopInsights }) {
  const orders = insights.orders;
  const issues = insights.listings?.issues;
  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Needs attention</h3>
        <p className="text-xs text-slate-500">What to act on today.</p>
      </div>
      <ul className="divide-y divide-slate-100 px-5 pb-3">
        {orders && (
          <>
            <AttentionRow icon={Truck} label="Paid, not shipped" value={String(orders.awaitingShipment)} tone={orders.awaitingShipment > 0 ? "warn" : "ok"} />
            <AttentionRow icon={AlertTriangle} label="Past expected ship date" value={String(orders.lateShipments)} tone={orders.lateShipments > 0 ? "warn" : "ok"} />
            <AttentionRow icon={Timer} label="Average time to ship" tone="neutral"
              value={orders.averageFulfillmentHours == null ? "—" : orders.averageFulfillmentHours >= 48 ? `${(orders.averageFulfillmentHours / 24).toFixed(1)} days` : `${Math.round(orders.averageFulfillmentHours)} h`}
              hint={`From payment to shipment, over ${orders.fulfillmentSampleSize} item(s)`} />
            <AttentionRow icon={ArrowDownRight} label="Refunds, last 30 days" value={orders.refundedOrders === 0 ? "0" : `${orders.refundedOrders} · ${money(orders.refunded, insights.currency)}`} tone={orders.refundedOrders > 0 ? "warn" : "ok"} />
          </>
        )}
        {issues && (
          <>
            <AttentionRow icon={Package} label="Low stock listings" value={String(issues.lowStock)} tone={issues.lowStock > 0 ? "warn" : "ok"} />
            <AttentionRow icon={Clock} label="Expiring within 14 days" value={String(issues.expiring)} tone={issues.expiring > 0 ? "warn" : "ok"} />
          </>
        )}
        {!orders && !issues && <li className="py-6 text-center text-sm text-slate-400">Nothing could be read from Etsy.</li>}
      </ul>
    </Card>
  );
}

function ListingsCard({ insights }: { insights: ShopInsights }) {
  const listings = insights.listings!;
  const issueCounts = [
    { key: "few_tags" as const, count: listings.issues.fewTags },
    { key: "few_photos" as const, count: listings.issues.fewPhotos },
    { key: "viewed_not_favorited" as const, count: listings.issues.viewedNotFavorited },
    { key: "low_stock" as const, count: listings.issues.lowStock },
    { key: "expiring" as const, count: listings.issues.expiring },
  ].filter((item) => item.count > 0);

  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
      <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Listings</h3>
          <p className="text-xs text-slate-500">The {listings.recent.length} most recently updated active listings, checked for common gaps.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(stateLabels).map(([state, label]) => (
            <span key={state} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{label} <span className="font-semibold tabular-nums">{listings.countsByState[state] ?? 0}</span></span>
          ))}
        </div>
      </div>
      {issueCounts.length > 0 && (
        <div className="mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="size-3.5" />
          {issueCounts.map((item) => <span key={item.key} title={issueLabel[item.key].hint}><span className="font-semibold">{item.count}</span> {issueLabel[item.key].label.toLowerCase()}</span>)}
          <span className="text-amber-700">of {listings.issues.checked} checked</span>
        </div>
      )}
      {listings.recent.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No active listings yet. Workflow drafts will appear here once they are published on Etsy.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {listings.recent.slice(0, 12).map((listing) => <ListingRow key={listing.listingId} listing={listing} currency={insights.currency} />)}
        </ul>
      )}
    </Card>
  );
}

function ListingRow({ listing, currency }: { listing: ShopListingRow; currency: string | null }) {
  return (
    <li className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {listing.imageUrl ? (
          // Etsy-hosted image; next/image would need the Etsy CDN whitelisted.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon className="size-5" /></span>
        )}
        <div className="min-w-0">
          {listing.url
            ? <a href={listing.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-slate-900 hover:text-[#F1641E] hover:underline" title={listing.title}>{listing.title}</a>
            : <p className="truncate text-sm font-medium text-slate-900" title={listing.title}>{listing.title}</p>}
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-500 tabular-nums">
            <span>{money(listing.price, listing.currency ?? currency)}</span>
            <span className={listing.issues.includes("low_stock") ? "font-semibold text-amber-700" : ""}>Stock {listing.quantity}</span>
            <span>{listing.views} views</span>
            <span><Heart className="inline size-3" /> {listing.favorites}</span>
            <span>{listing.tagCount}/13 tags</span>
            <span>{listing.imageCount} photos</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 sm:max-w-80 sm:justify-end">
        {listing.issues.length === 0
          ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Looks good</span>
          : listing.issues.map((issue) => <span key={issue} title={issueLabel[issue].hint} className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">{issueLabel[issue].label}</span>)}
      </div>
    </li>
  );
}

function BestSellers({ orders, currency }: { orders: OrderInsights | null; currency: string | null }) {
  const peak = Math.max(1, ...(orders?.topListings.map((item) => item.revenue) ?? [0]));
  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Best sellers, last 30 days</h3>
        <p className="text-xs text-slate-500">By revenue, and where buyers order from.</p>
      </div>
      {!orders || orders.topListings.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No sales in the last 30 days yet.</p>
      ) : (
        <div className="space-y-4 px-5 py-4">
          <ul className="space-y-2">
            {orders.topListings.map((item) => (
              <li key={item.listingId ?? item.title} className="text-xs">
                <div className="flex justify-between gap-3"><span className="truncate text-slate-800" title={item.title}>{item.title}</span><span className="shrink-0 font-semibold text-slate-900 tabular-nums">{money(item.revenue, currency)}</span></div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 rounded-full bg-slate-100"><span className="block h-1.5 rounded-full bg-[#F1641E]" style={{ width: `${(item.revenue / peak) * 100}%` }} /></span>
                  <span className="w-14 text-right text-[11px] text-slate-500 tabular-nums">{item.units} sold</span>
                </div>
              </li>
            ))}
          </ul>
          {orders.topCountries.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-xs">
              <Globe2 className="size-3.5 text-slate-400" />
              {orders.topCountries.map((country) => <span key={country.countryIso} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{country.countryIso} · {country.orders}</span>)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ReviewsCard({ insights }: { insights: ShopInsights }) {
  const reviews = insights.reviews;
  const peak = Math.max(1, ...Object.values(reviews?.distribution ?? {}));
  return (
    <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">Reviews</h3>
        <p className="text-xs text-slate-500">{reviews ? `From the newest ${reviews.sampled} review(s).` : "Reviews could not be read."}</p>
      </div>
      {!reviews || reviews.sampled === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No reviews yet.</p>
      ) : (
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[8rem_1fr]">
          <div>
            <p className="flex items-center gap-1 text-3xl font-bold text-slate-900 tabular-nums">{reviews.average?.toFixed(1)}<Star className="size-5 fill-amber-400 text-amber-400" /></p>
            <div className="mt-2 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-3 tabular-nums">{star}</span>
                  <span className="h-1.5 flex-1 rounded-full bg-slate-100"><span className={`block h-1.5 rounded-full ${star >= 4 ? "bg-amber-400" : "bg-slate-400"}`} style={{ width: `${((reviews.distribution[star] ?? 0) / peak) * 100}%` }} /></span>
                  <span className="w-5 text-right tabular-nums">{reviews.distribution[star] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {reviews.recent.map((review, index) => (
              <li key={`${review.createdAtUtc}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <p className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: 5 }, (_, star) => <Star key={star} className={`size-3 ${star < review.rating ? "fill-amber-400" : "text-slate-300"}`} />)}
                  {review.createdAtUtc && <span className="ml-2 text-slate-400">{new Date(review.createdAtUtc).toLocaleDateString()}</span>}</p>
                <p className="mt-1 line-clamp-2 text-slate-700">{review.text ?? "No comment."}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
