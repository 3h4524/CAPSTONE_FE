"use client";

import { type ReactNode, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, Info, Map as MapIcon, Sparkles, Tag, Target, TriangleAlert } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useTranslation } from "react-i18next";

import type { MarketListingPoint, SellerNicheMarketInsight, SellerOpportunity, SellerResearchProfileInput } from "@/api/market-opportunities";
import { NicheMapChart, type NicheMapPoint } from "@/components/opportunities/market-charts";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

/** A hint on hover, or on a tap on a phone, where a tooltip would never open. */
export function TapHint({ content, children, contentClassName, side }: { content: ReactNode; children: ReactNode; contentClassName?: string; side?: "left" | "top" }) {
  const isPhone = useIsPhone();
  if (!isPhone) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className={contentClassName}>{content}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          collisionPadding={16}
          className={cn("bg-foreground text-background z-50 w-fit max-w-[calc(100vw-2rem)] rounded-md px-3 py-1.5 text-xs", contentClassName)}
        >
          {content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * How a figure is measured, on demand. Method text is needed once, so it sits behind the icon
 * instead of under every figure.
 */
export function InfoTip({ text, label }: { text: string; label?: string }) {
  return (
    <TapHint content={text} contentClassName="max-w-72 text-left leading-5">
      <button type="button" className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-ink-400 hover:text-ink-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" aria-label={label ?? text}>
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </TapHint>
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const money = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/* ---------------------------------------------------------------- Niche map */

/** Places each tracked niche by competition against buyer interest, split at the medians of the tracked niches. */
export function buildNicheMap(insights: SellerNicheMarketInsight[]) {
  const points = insights
    .filter((insight) => insight.signals.sellerCount > 0 && insight.signals.medianFavoritesPer30Days != null)
    .map((insight) => ({
      niche: insight.niche,
      strongSharePercent: Math.round((insight.signals.strongSellerCount / insight.signals.sellerCount) * 100),
      favoritesPer30Days: round1(insight.signals.medianFavoritesPer30Days ?? 0),
      activeListingCount: insight.marketSupply.activeListingCount,
      isOpening: false,
    }));
  const splitX = median(points.map((point) => point.strongSharePercent));
  const splitY = median(points.map((point) => point.favoritesPer30Days));
  const placed: NicheMapPoint[] = points.map((point) => ({
    ...point,
    // Strictly better than the median on both axes, so an all-equal dataset marks nothing.
    isOpening: point.favoritesPer30Days > splitY && point.strongSharePercent < splitX,
  }));
  return { points: placed, splitX, splitY };
}

export function NicheMapCard({
  insights,
  selected,
  onSelect,
}: {
  insights: SellerNicheMarketInsight[];
  selected: string | null;
  onSelect: (niche: string) => void;
}) {
  const { t } = useTranslation("common");
  const map = useMemo(() => buildNicheMap(insights), [insights]);
  // Two niches split into nothing useful; the map starts at three.
  if (map.points.length < 3) return null;
  const opening = map.points.filter((point) => point.isOpening).sort((a, b) => b.favoritesPer30Days - a.favoritesPer30Days);

  return (
    <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
      <div className="px-5 pt-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <MapIcon className="size-4 text-blue-600 dark:text-blue-400" />
          {t("marketRadar.nicheMapTitle", { defaultValue: "Niche map" })}
          <InfoTip text={t("marketRadar.nicheMapMethod", {
            defaultValue: "Each dot is a niche matched to your profile. Up: buyers favorite its top listings more. Left: fewer of its top shops are strong. The green corner beats the median niche on both ({{fav}} favorites / month, {{share}}% strong shops).",
            fav: round1(map.splitY),
            share: Math.round(map.splitX),
          })} />
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {t("marketRadar.nicheMapSubtitle", { defaultValue: "{{count}} niches. Click one to open it below.", count: map.points.length })}
        </p>
      </div>
      <div className="px-3 pt-2">
        <NicheMapChart points={map.points} splitX={map.splitX} splitY={map.splitY} selected={selected} onSelect={onSelect} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-3">
        <span className="text-xs font-semibold text-ink-600">{t("marketRadar.nicheMapOpeningList", { defaultValue: "Enter first:" })}</span>
        {opening.length === 0 ? (
          <span className="text-xs text-ink-400">{t("marketRadar.nicheMapNoOpening", { defaultValue: "No niche beats the median on both interest and competition yet." })}</span>
        ) : opening.map((point) => (
          <button
            key={point.niche}
            type="button"
            onClick={() => onSelect(point.niche)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 transition-colors ${point.niche === selected ? "bg-emerald-600 text-white ring-emerald-600" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"}`}
          >
            {point.niche} · {point.favoritesPer30Days}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- Niche selector */

/** Picks the niche in focus; shared with the niche map, so both tabs show the same niche. */
export function NicheSelect({ insights, selected, onSelect }: { insights: SellerNicheMarketInsight[]; selected: string; onSelect: (niche: string) => void }) {
  const { t } = useTranslation("common");
  if (insights.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ink-500 max-md:w-full">
      <span className="shrink-0">{t("marketRadar.nicheSelectLabel", { defaultValue: "Niche" })}</span>
      <select
        value={selected}
        onChange={(event) => onSelect(event.target.value)}
        className="h-8 max-w-64 min-w-0 truncate rounded-lg border border-ink-200 bg-card px-2 text-sm text-ink-800 capitalize shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none max-md:h-11 max-md:max-w-none max-md:flex-1 max-md:text-base"
      >
        {insights.map((insight) => <option key={insight.niche} value={insight.niche}>{insight.niche}</option>)}
      </select>
    </label>
  );
}

/* -------------------------------------------------------- Competitor tiles */

/** Small label/value pairs that fill a metric tile with the figures behind its headline. */
export function MiniStats({ items }: { items: Array<{ label: string; value: string; hint?: string; tone?: "good" | "warn" }> }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-card px-2.5 py-2 ring-1 ring-ink-100">
          <dt className="text-[11px] leading-4 text-ink-500">{item.label}</dt>
          <dd className={`text-sm font-semibold tabular-nums ${item.tone === "good" ? "text-emerald-700 dark:text-emerald-300" : item.tone === "warn" ? "text-amber-700 dark:text-amber-300" : "text-ink-900"}`}>{item.value}</dd>
          {/* The unit or scope of the figure, so a bare number cannot be read as something else. */}
          {item.hint && <dd className="text-[10px] leading-3 text-ink-400">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

const ageBands = [
  { id: "under1", maxDays: 30 },
  { id: "1to3", maxDays: 90 },
  { id: "3to6", maxDays: 180 },
  { id: "6to12", maxDays: 365 },
  { id: "over12", maxDays: Number.POSITIVE_INFINITY },
] as const;

/** Share of the top listings by age, so "established" or "fresh" shows how the top is made up. */
export function ListingAgeBars({ points }: { points: MarketListingPoint[] }) {
  const { t } = useTranslation("common");
  const counts = useMemo(() => {
    const result = ageBands.map(() => 0);
    for (const point of points) {
      const index = ageBands.findIndex((band) => point.ageDays < band.maxDays);
      result[index === -1 ? ageBands.length - 1 : index] += 1;
    }
    return result;
  }, [points]);
  if (points.length === 0) return null;
  const peak = Math.max(...counts, 1);
  const label = {
    under1: t("marketRadar.ageUnder1", { defaultValue: "< 1 mo" }),
    "1to3": t("marketRadar.age1to3", { defaultValue: "1–3 mo" }),
    "3to6": t("marketRadar.age3to6", { defaultValue: "3–6 mo" }),
    "6to12": t("marketRadar.age6to12", { defaultValue: "6–12 mo" }),
    over12: t("marketRadar.ageOver12", { defaultValue: "> 1 yr" }),
  };

  return (
    <div className="space-y-1.5" role="img" aria-label={t("marketRadar.ageBarsLabel", { defaultValue: "Top listings by age" })}>
      {ageBands.map((band, index) => {
        const percent = Math.round((counts[index] / points.length) * 100);
        // Listings under 3 months old are the newcomers that already made the top.
        const fresh = band.maxDays <= 90;
        return (
          <div key={band.id} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-[11px]">
            <span className="text-ink-500 tabular-nums">{label[band.id]}</span>
            <span className="h-2 rounded-full bg-ink-200/70">
              <span className={`block h-2 rounded-full ${fresh ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.max(counts[index] ? 3 : 0, (counts[index] / peak) * 100)}%` }} />
            </span>
            <span className="text-right font-semibold text-ink-700 tabular-nums">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------- Competitor leaderboard */

// A phone lists the largest few shops first; the rest open on request.
const PHONE_SHOPS = 5;

type Competitor = SellerNicheMarketInsight["competitors"][number];

/**
 * The shops holding the most of the latest top-listing sample. No per-shop trend is shown: the backend
 * deliberately leaves it unknown, because a shop's count inside a top-N sample moves with the sample,
 * not with the shop's catalogue (see SellerNicheInsightCalculator.BuildCompetitors).
 */
export function CompetitorLeaderboard({ competitors, sampleListingCount, currency }: { competitors: Competitor[]; sampleListingCount: number; currency: string | null }) {
  const { t } = useTranslation("common");
  const ranked = useMemo(() => [...competitors].sort((a, b) => b.listingCount - a.listingCount).slice(0, 8), [competitors]);
  const isPhone = useIsPhone();
  const [showsAll, setShowsAll] = useState(false);
  if (ranked.length === 0) return null;
  const visible = isPhone && !showsAll ? ranked.slice(0, PHONE_SHOPS) : ranked;
  const peak = Math.max(...ranked.map((item) => item.listingCount), 1);
  const heldByRanked = ranked.reduce((sum, item) => sum + item.listingCount, 0);
  const heldShare = sampleListingCount > 0 ? Math.round((heldByRanked / sampleListingCount) * 1000) / 10 : null;

  return (
    <div className="border-t border-ink-100 px-5 py-4 max-md:px-4">
      <p className="text-sm font-semibold text-ink-900">{t("marketRadar.leaderboardTitle", { defaultValue: "Shops holding the most top listings" })}</p>
      <p className="text-xs text-ink-500">
        {heldShare != null
          ? t("marketRadar.leaderboardShare", { defaultValue: "Together these {{total}} shops hold {{held}} of the {{sample}} top listings sampled ({{share}}%). Open their best listing to see what wins.", total: ranked.length, held: heldByRanked, sample: sampleListingCount, share: heldShare })
          : t("marketRadar.leaderboardNoShare", { defaultValue: "Open their best listing to see what wins." })}
      </p>
      <ol className="mt-3 space-y-1.5">
        {visible.map((competitor, index) => {
          const share = sampleListingCount > 0 ? Math.round((competitor.listingCount / sampleListingCount) * 1000) / 10 : null;
          return (
            <li key={competitor.sellerId} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-ink-50 sm:grid-cols-[2rem_minmax(0,14rem)_minmax(0,1fr)_auto]">
              <span className="flex size-7 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600 tabular-nums">{index + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-800">{t("marketRadar.shopRank", { defaultValue: "Shop {{rank}}", rank: index + 1 })}</p>
                {competitor.representativeListingUrl
                  ? <a className="block truncate text-xs text-blue-700 dark:text-blue-300 hover:underline" href={competitor.representativeListingUrl} target="_blank" rel="noreferrer" title={competitor.representativeListingTitle}>{competitor.representativeListingTitle}</a>
                  : <p className="truncate text-xs text-ink-500" title={competitor.representativeListingTitle}>{competitor.representativeListingTitle}</p>}
              </div>
              <div className="col-span-3 flex items-center gap-2 sm:col-span-1">
                <span className="h-2 flex-1 rounded-full bg-ink-100">
                  <span className="block h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, (competitor.listingCount / peak) * 100)}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-ink-600 tabular-nums">
                  {t("marketRadar.listingsAtTopCount", { defaultValue: "{{count}} listings", count: competitor.listingCount })}
                  {share != null && <span className="text-ink-400"> · {share}%</span>}
                </span>
              </div>
              <span className="col-start-3 row-start-1 text-right text-xs font-medium text-ink-700 tabular-nums sm:col-start-auto sm:row-start-auto">
                {competitor.representativePrice == null ? "—" : `${money(competitor.representativePrice)}${currency ? ` ${currency}` : ""}`}
              </span>
            </li>
          );
        })}
      </ol>
      {isPhone && ranked.length > PHONE_SHOPS && (
        <button type="button" className="mt-1 min-h-10 w-full text-xs font-semibold text-blue-700 dark:text-blue-300" onClick={() => setShowsAll((value) => !value)}>
          {showsAll
            ? t("marketRadar.showFewerShops", { defaultValue: "Show fewer shops" })
            : t("marketRadar.showAllShops", { defaultValue: "Show all {{count}} shops", count: ranked.length })}
        </button>
      )}
      <p className="mt-2 text-[11px] text-ink-400">{t("marketRadar.leaderboardNote", { defaultValue: "Shops are numbered by how many top listings they hold; the link opens their best listing. Share is of the top listings sampled." })}</p>
    </div>
  );
}

/* -------------------------------------------------------- Competitor prices */

/**
 * The top shops' best-listing prices on one line, with the typical price band and the seller's own
 * target range, so a gap in the market reads at a glance.
 */
export function CompetitorPriceStrip({
  competitors,
  p25,
  p75,
  currency,
  minimumPrice,
  maximumPrice,
}: {
  competitors: Competitor[];
  p25: number | null;
  p75: number | null;
  currency: string | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
}) {
  const { t } = useTranslation("common");
  const prices = competitors.map((item) => item.representativePrice).filter((price): price is number => price != null && price > 0);
  if (prices.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  // A luxury outlier would squeeze every other dot together, so the axis stops at the 90th percentile.
  const cap = Math.max(sorted[Math.max(0, Math.ceil(sorted.length * 0.9) - 1)], p75 ?? 0, maximumPrice ?? 0) * 1.1;
  const position = (price: number) => `${Math.min(100, (price / cap) * 100)}%`;
  const width = (from: number, to: number) => `${Math.max(0.5, ((Math.min(to, cap) - from) / cap) * 100)}%`;
  const unit = currency ? ` ${currency}` : "";
  const hasProfileRange = minimumPrice != null || maximumPrice != null;
  const profileFrom = minimumPrice ?? 0;
  const profileTo = maximumPrice ?? cap;
  const inProfile = hasProfileRange ? prices.filter((price) => price >= profileFrom && price <= profileTo).length : null;
  const below = p25 == null ? 0 : prices.filter((price) => price < p25).length;
  const above = p75 == null ? 0 : prices.filter((price) => price > p75).length;

  return (
    <div className="border-t border-ink-100 px-5 py-4 max-md:px-4">
      <p className="text-sm font-semibold text-ink-900">{t("marketRadar.priceStripTitle", { defaultValue: "Where top shops set their price" })}</p>
      <p className="text-xs text-ink-500">
        {inProfile != null
          ? t("marketRadar.priceStripProfile", { defaultValue: "{{inside}} of {{total}} top shops price inside your target range; {{below}} sit below the typical band and {{above}} above it.", inside: inProfile, total: prices.length, below, above })
          : t("marketRadar.priceStripNoProfile", { defaultValue: "{{below}} of {{total}} top shops sit below the typical band and {{above}} above it. Add a target price range to your profile to place yourself.", total: prices.length, below, above })}
      </p>
      <div className="relative mt-6 mb-7 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-ink-200" />
        {p25 != null && p75 != null && (
          <div className="absolute top-1 bottom-1 rounded bg-blue-100/70 dark:bg-blue-500/15" style={{ left: position(p25), width: width(p25, p75) }} title={t("marketRadar.typicalPriceBand", { defaultValue: "Typical price (middle 50%)" })} />
        )}
        {hasProfileRange && (
          <div className="absolute -top-1 -bottom-1 rounded border-2 border-dashed border-emerald-500" style={{ left: position(profileFrom), width: width(profileFrom, profileTo) }} />
        )}
        {prices.map((price, index) => (
          <span
            key={`${price}-${index}`}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-ink-700 shadow-sm"
            style={{ left: position(price) }}
            title={`${money(price)}${unit}`}
          />
        ))}
        <span className="absolute -bottom-6 left-0 text-[11px] text-ink-400 tabular-nums">0</span>
        <span className="absolute right-0 -bottom-6 text-[11px] text-ink-400 tabular-nums">{money(Math.round(cap))}{unit}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ink-700" />{t("marketRadar.priceStripShop", { defaultValue: "A top shop's best listing" })}</span>
        {p25 != null && p75 != null && <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-blue-100 dark:bg-blue-500/15" />{t("marketRadar.priceStripBand", { defaultValue: "Typical price {{from}}–{{to}}{{unit}}", from: money(p25), to: money(p75), unit })}</span>}
        {hasProfileRange && <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border-2 border-dashed border-emerald-500" />{t("marketRadar.priceStripYou", { defaultValue: "Your target range" })}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Profile impact */

/** Lower case, with punctuation as spaces, so "T-Shirt" and "t shirt" match. */
const normalizeTerm = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const matchesTerm = (item: SellerOpportunity, term: string) => {
  const needle = normalizeTerm(term);
  return needle.length > 0 && ` ${normalizeTerm(`${item.niche} ${item.title}`)} `.includes(` ${needle} `);
};

/** Score from which an uncovered opportunity is worth suggesting as a keyword. */
const suggestFromScore = 70;

/**
 * How the saved profile shapes the radar: what each keyword matches, how the price range sits against the
 * opportunities, and strong opportunities the keywords miss. Matching runs on the source (English) data.
 */
export function buildProfileImpact(profile: SellerResearchProfileInput, opportunities: SellerOpportunity[]) {
  const active = opportunities.filter((item) => item.state !== "ignored" && item.state !== "dismissed");
  const keywords = profile.preferredKeywords.map((keyword) => ({
    keyword,
    matches: active.filter((item) => matchesTerm(item, keyword)).length,
  }));

  const priced = active.filter((item) => item.insights.medianPrice != null);
  const hasRange = profile.minimumPrice != null || profile.maximumPrice != null;
  const low = profile.minimumPrice ?? 0;
  const high = profile.maximumPrice ?? Number.POSITIVE_INFINITY;
  const price = hasRange && priced.length > 0
    ? {
        inside: priced.filter((item) => item.insights.medianPrice! >= low && item.insights.medianPrice! <= high).length,
        below: priced.filter((item) => item.insights.medianPrice! < low).length,
        above: priced.filter((item) => item.insights.medianPrice! > high).length,
        total: priced.length,
        prices: priced.map((item) => item.insights.medianPrice!),
      }
    : null;

  // The best uncovered opportunity per niche, strongest first.
  const byNiche = new Map<string, SellerOpportunity>();
  for (const item of active) {
    if (item.finalScore < suggestFromScore || profile.preferredKeywords.some((keyword) => matchesTerm(item, keyword))) continue;
    const key = normalizeTerm(item.niche);
    if (!key || profile.preferredKeywords.some((keyword) => normalizeTerm(keyword) === key)) continue;
    const current = byNiche.get(key);
    if (!current || item.finalScore > current.finalScore) byNiche.set(key, item);
  }
  const suggestions = [...byNiche.values()].sort((a, b) => b.finalScore - a.finalScore).slice(0, 6)
    .map((item) => ({ keyword: item.niche.toLowerCase(), score: Math.round(item.finalScore) }));

  const missing = [
    !profile.shopGoal?.trim() && "shopGoal",
    profile.targetAudiences.length === 0 && "audiences",
    profile.preferredCategories.length === 0 && "categories",
    profile.excludedCategories.length === 0 && "excluded",
    profile.preferredKeywords.length === 0 && "keywords",
    !hasRange && "price",
  ].filter((item): item is string => Boolean(item));

  return { keywords, price, suggestions, missing, opportunityCount: active.length };
}

function ChipRow({ label, items, tone = "slate" }: { label: string; items: string[]; tone?: "slate" | "rose" }) {
  const { t } = useTranslation("common");
  return (
    <div className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-start">
      <p className="pt-1 text-[11px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0
          ? <span className="text-xs text-ink-400">{t("marketRadar.notSet", { defaultValue: "Not set" })}</span>
          : items.map((item) => (
              <span key={item} className={`rounded-full px-2.5 py-1 text-xs ring-1 ${tone === "rose" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through decoration-rose-300 ring-rose-100 dark:ring-rose-500/30" : "bg-ink-50 text-ink-700 ring-ink-200"}`}>{item}</span>
            ))}
      </div>
    </div>
  );
}

export function ProfileImpactCard({
  profile,
  opportunities,
  onAddKeyword,
  adding,
}: {
  profile: SellerResearchProfileInput;
  opportunities: SellerOpportunity[];
  onAddKeyword: (keyword: string) => void;
  adding: string | null;
}) {
  const { t } = useTranslation("common");
  const impact = useMemo(() => buildProfileImpact(profile, opportunities), [profile, opportunities]);
  const range = `$${profile.minimumPrice ?? 0}–${profile.maximumPrice != null ? `$${profile.maximumPrice}` : t("marketRadar.anyPrice", { defaultValue: "any" })}`;
  const missingLabel: Record<string, string> = {
    shopGoal: t("marketRadar.missingGoal", { defaultValue: "Shop goal" }),
    audiences: t("marketRadar.missingAudiences", { defaultValue: "Target audiences" }),
    categories: t("marketRadar.missingCategories", { defaultValue: "Preferred categories" }),
    excluded: t("marketRadar.missingExcluded", { defaultValue: "Excluded categories" }),
    keywords: t("marketRadar.missingKeywords", { defaultValue: "Preferred keywords" }),
    price: t("marketRadar.missingPrice", { defaultValue: "Target price range" }),
  };
  const sortedKeywords = [...impact.keywords].sort((a, b) => b.matches - a.matches);
  const unmatched = impact.keywords.filter((item) => item.matches === 0).length;
  const peak = Math.max(...impact.keywords.map((item) => item.matches), 1);

  return (
    <div className="grid gap-4 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 lg:grid-cols-2">
      <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm lg:col-span-2">
        <div className="space-y-3 px-5 py-4">
          <ChipRow label={t("marketRadar.targetAudiences", { defaultValue: "Target audiences" })} items={profile.targetAudiences} />
          <ChipRow label={t("marketRadar.preferredCategories", { defaultValue: "Preferred categories" })} items={profile.preferredCategories} />
          <ChipRow label={t("marketRadar.excludedCategories", { defaultValue: "Excluded categories" })} items={profile.excludedCategories} tone="rose" />
        </div>
        {impact.missing.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 bg-amber-50/60 dark:bg-amber-500/10 px-5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon />
            <span className="font-semibold">{t("marketRadar.profileMissing", { defaultValue: "Not filled in yet:" })}</span>
            {impact.missing.map((item) => <span key={item} className="rounded-full bg-card px-2 py-0.5 ring-1 ring-amber-200 dark:ring-amber-500/30">{missingLabel[item]}</span>)}
            <span className="text-amber-700 dark:text-amber-300">{t("marketRadar.profileMissingHint", { defaultValue: "Each one sharpens the ranking." })}</span>
          </div>
        )}
      </Card>

      <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
        <div className="px-5 pt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Tag className="size-4 text-blue-600 dark:text-blue-400" />{t("marketRadar.keywordCoverageTitle", { defaultValue: "What your keywords match" })}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {impact.keywords.length === 0
              ? t("marketRadar.keywordCoverageEmpty", { defaultValue: "Add preferred keywords so the radar knows which products you make." })
              : unmatched > 0
                ? t("marketRadar.keywordCoverageGaps", { defaultValue: "Opportunities in your radar ({{total}}) that mention each keyword. {{count}} keyword(s) match nothing: no market data is collected for them yet, so they do not help the ranking.", total: impact.opportunityCount, count: unmatched })
                : t("marketRadar.keywordCoverageAll", { defaultValue: "Opportunities in your radar ({{total}}) that mention each keyword. Every keyword matches at least one.", total: impact.opportunityCount })}
          </p>
        </div>
        <ul className="space-y-1.5 px-5 py-4">
          {sortedKeywords.map((item) => (
            <li key={item.keyword} className="grid grid-cols-[minmax(0,8rem)_1fr_4.5rem] items-center gap-3 text-xs max-md:grid-cols-[minmax(0,6rem)_1fr_4rem] max-md:gap-2">
              <span className={`truncate ${item.matches === 0 ? "text-ink-400" : "font-medium text-ink-800"}`} title={item.keyword}>{item.keyword}</span>
              <span className="h-2 rounded-full bg-ink-100">
                {item.matches > 0 && <span className="block h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, (item.matches / peak) * 100)}%` }} />}
              </span>
              <span className={`text-right tabular-nums ${item.matches === 0 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-ink-600"}`}>
                {item.matches === 0
                  ? t("marketRadar.noMatch", { defaultValue: "no match" })
                  : t("marketRadar.matchCount", { defaultValue: "{{count}} opp.", count: item.matches })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
          <div className="px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Target className="size-4 text-blue-600 dark:text-blue-400" />{t("marketRadar.priceFitTitle", { defaultValue: "Your price range against the radar" })}</p>
            {impact.price ? (
              <>
                <p className="mt-0.5 text-xs text-ink-500">
                  {t("marketRadar.priceFitLine", {
                    defaultValue: "{{inside}} of {{total}} opportunities have a typical price inside {{range}}; {{below}} are cheaper and {{above}} dearer.",
                    inside: impact.price.inside, total: impact.price.total, range, below: impact.price.below, above: impact.price.above,
                  })}
                </p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={t("marketRadar.priceFitTitle", { defaultValue: "Your price range against the radar" })}>
                  <span className="bg-ink-300" style={{ width: `${(impact.price.below / impact.price.total) * 100}%` }} title={t("marketRadar.priceFitBelow", { defaultValue: "Cheaper than your range" })} />
                  <span className="bg-emerald-500" style={{ width: `${(impact.price.inside / impact.price.total) * 100}%` }} title={t("marketRadar.priceFitInside", { defaultValue: "Inside your range" })} />
                  <span className="bg-amber-400" style={{ width: `${(impact.price.above / impact.price.total) * 100}%` }} title={t("marketRadar.priceFitAbove", { defaultValue: "Dearer than your range" })} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink-300" />{t("marketRadar.priceFitBelow", { defaultValue: "Cheaper than your range" })} · {impact.price.below}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" />{t("marketRadar.priceFitInside", { defaultValue: "Inside your range" })} · {impact.price.inside}</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400" />{t("marketRadar.priceFitAbove", { defaultValue: "Dearer than your range" })} · {impact.price.above}</span>
                </div>
              </>
            ) : (
              <p className="mt-0.5 text-xs text-ink-500">{t("marketRadar.priceFitNone", { defaultValue: "Set a target price range to see how many opportunities it covers." })}</p>
            )}
          </div>
        </Card>

        <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
          <div className="px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Sparkles className="size-4 text-blue-600 dark:text-blue-400" />{t("marketRadar.suggestTitle", { defaultValue: "Strong niches your keywords miss" })}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {impact.suggestions.length > 0
                ? t("marketRadar.suggestLine", { defaultValue: "Opportunities scoring {{score}}+ that none of your keywords mention. Adding one saves your profile and re-ranks the radar.", score: suggestFromScore })
                : t("marketRadar.suggestNone", { defaultValue: "Your keywords already cover every opportunity scoring {{score}} or more.", score: suggestFromScore })}
            </p>
            {impact.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {impact.suggestions.map((item) => (
                  <button
                    key={item.keyword}
                    type="button"
                    disabled={adding !== null}
                    onClick={() => onAddKeyword(item.keyword)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-500/30 transition-colors hover:bg-blue-100 dark:hover:bg-blue-500/15 disabled:opacity-60"
                  >
                    <span className="font-bold">{adding === item.keyword ? "…" : "+"}</span>
                    <span className="capitalize">{item.keyword}</span>
                    <span className="rounded-full bg-card px-1.5 text-[10px] font-bold text-ink-600 tabular-nums">{item.score}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TriangleAlertIcon() {
  return <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />;
}

/* --------------------------------------------------------- Price sweet spot */

type PriceBand = {
  from: number;
  to: number;
  count: number;
  /** Listings gaining at least one favorite a month. */
  activeCount: number;
  activePercent: number;
  medianFavorites: number;
  listings: MarketListingPoint[];
};

/** A listing counts as drawing interest from one favorite a month. */
const activeFavorites = 1;
/** The best band must beat the niche by this many points, or the difference is noise. */
const minimumLeadPoints = 10;

/**
 * Splits the top listings into price quartiles, so every band holds the same number of listings,
 * and finds the band where listings most often draw interest. The share of active listings is used,
 * not the median, because in most niches over half the listings have no favorites and every median is 0.
 * Needs 12 listings so each band has at least three.
 */
export function buildPriceSweetSpot(points: MarketListingPoint[]) {
  const priced = points.filter((point) => point.price > 0).sort((a, b) => a.price - b.price);
  if (priced.length < 12) return null;
  const bandCount = 4;
  const bands: PriceBand[] = [];
  for (let index = 0; index < bandCount; index++) {
    const slice = priced.slice(Math.floor((index * priced.length) / bandCount), Math.floor(((index + 1) * priced.length) / bandCount));
    const activeCount = slice.filter((point) => point.favoritesPer30Days >= activeFavorites).length;
    bands.push({
      from: slice[0].price,
      to: slice[slice.length - 1].price,
      count: slice.length,
      activeCount,
      activePercent: Math.round((activeCount / slice.length) * 100),
      medianFavorites: round1(median(slice.map((point) => point.favoritesPer30Days))),
      listings: [...slice].sort((a, b) => b.favoritesPer30Days - a.favoritesPer30Days),
    });
  }
  const overallPercent = Math.round((priced.filter((point) => point.favoritesPer30Days >= activeFavorites).length / priced.length) * 100);
  const leader = bands.reduce((top, band) => (band.activePercent > top.activePercent ? band : top), bands[0]);
  // A lead of a few points, or a single active listing, says nothing about price.
  const best = leader.activeCount >= 2 && leader.activePercent - overallPercent >= minimumLeadPoints ? leader : null;
  return { bands, best, overallPercent };
}

function profileFit(band: PriceBand, minimum: number | null, maximum: number | null) {
  if (minimum == null && maximum == null) return "none" as const;
  const low = minimum ?? 0;
  const high = maximum ?? Number.POSITIVE_INFINITY;
  if (band.to < low) return "below" as const;
  if (band.from > high) return "above" as const;
  return band.from >= low && band.to <= high ? "inside" as const : "partial" as const;
}

/**
 * The one price block of a niche: where top listings price, which price band draws interest, and how that
 * sits against the seller's range. The listing-level chart and table wait behind a toggle (<paramref>details</paramref>).
 */
export function PriceSweetSpot({
  points,
  currency,
  minimumPrice,
  maximumPrice,
  p25,
  p75,
  details,
}: {
  points: MarketListingPoint[];
  currency: string | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  p25: number | null;
  p75: number | null;
  details?: ReactNode;
}) {
  const { t } = useTranslation("common");
  const result = useMemo(() => buildPriceSweetSpot(points), [points]);
  const [openBand, setOpenBand] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  if (!result && !details) return null;
  const bands = result?.bands ?? [];
  const best = result?.best ?? null;
  const overallPercent = result?.overallPercent ?? 0;
  const peak = Math.max(...bands.map((band) => band.activePercent), 1);
  const fit = best ? profileFit(best, minimumPrice, maximumPrice) : "none";
  const unit = currency ? ` ${currency}` : "";
  const range = (band: PriceBand) => `${money(band.from)}–${money(band.to)}${unit}`;
  const fitText = {
    inside: t("marketRadar.sweetSpotInside", { defaultValue: "Inside your target price range — price your listing here." }),
    partial: t("marketRadar.sweetSpotPartial", { defaultValue: "Overlaps your target price range — aim for the overlapping part." }),
    below: t("marketRadar.sweetSpotBelow", { defaultValue: "Below your target price range — you would compete on price, or need a premium angle to sell higher." }),
    above: t("marketRadar.sweetSpotAbove", { defaultValue: "Above your target price range — buyers here pay more than you planned to charge." }),
    none: t("marketRadar.sweetSpotNoProfile", { defaultValue: "Add a target price range to your seller profile to compare it with this band." }),
  }[fit];

  return (
    <div className="mx-5 mb-5 rounded-xl border border-ink-100 p-4 max-md:mx-4 max-md:mb-4 max-md:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Tag className="size-4 text-blue-600 dark:text-blue-400" />
          {t("marketRadar.sweetSpotTitle", { defaultValue: "Price" })}
          <InfoTip text={t("marketRadar.sweetSpotMethod", { defaultValue: "Prices are Etsy list prices before sales and coupons; many shops discount all the time, so buyers often pay less. Each band holds a quarter of the top listings; \"active\" means 1+ favorite a month. Click a band to see its listings." })} />
        </p>
        {p25 != null && p75 != null && (
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600 tabular-nums">
            {t("marketRadar.typicalPriceChip", { defaultValue: "Typical {{from}}–{{to}}{{unit}}", from: money(p25), to: money(p75), unit })}
          </span>
        )}
      </div>
      {!result ? (
        <p className="mt-0.5 text-sm text-ink-500">{t("marketRadar.sweetSpotTooFew", { defaultValue: "Too few priced listings to compare price bands yet." })}</p>
      ) : best ? (
        <p className="mt-0.5 text-sm text-ink-600">
          {t("marketRadar.sweetSpotLine", {
            defaultValue: "Listings priced {{range}} draw interest most often: {{share}}% gain 1+ favorite a month, against {{overall}}% across the niche.",
            range: range(best),
            share: best.activePercent,
            overall: overallPercent,
          })}
          {" "}<span className={fit === "inside" || fit === "partial" ? "font-medium text-emerald-700 dark:text-emerald-300" : fit === "none" ? "text-ink-500" : "font-medium text-amber-700 dark:text-amber-300"}>{fitText}</span>
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-ink-500">
          {t("marketRadar.sweetSpotNone", {
            defaultValue: "No clear sweet spot: {{overall}}% of listings gain 1+ favorite a month and no price band beats that by {{lead}} points. Price is not what sets listings apart here — design and keywords are.",
            overall: overallPercent,
            lead: minimumLeadPoints,
          })}
        </p>
      )}
      <div className="mt-3 space-y-1">
        {bands.map((band, index) => {
          const isBest = band === best;
          const isOpen = openBand === index;
          return (
            <div key={`${band.from}-${band.to}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenBand(isOpen ? null : index)}
                className={`grid w-full grid-cols-[1rem_minmax(0,9rem)_1fr_5.5rem] items-center gap-3 rounded-lg px-1 py-1 text-left text-xs transition-colors hover:bg-ink-50 max-md:grid-cols-[1rem_minmax(0,1fr)_auto] max-md:gap-x-2 max-md:gap-y-1 ${isOpen ? "bg-ink-50" : ""}`}
              >
                <ChevronRight className={`size-3.5 text-ink-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className={`truncate tabular-nums ${isBest ? "font-semibold text-ink-900" : "text-ink-600"}`}>{range(band)}</span>
                <span className="h-2 rounded-full bg-ink-100 max-md:col-start-2 max-md:col-end-4 max-md:row-start-2">
                  <span className={`block h-2 rounded-full ${isBest ? "bg-emerald-500" : "bg-blue-300"}`} style={{ width: `${Math.max(2, (band.activePercent / peak) * 100)}%` }} />
                </span>
                <span className={`text-right tabular-nums max-md:col-start-3 max-md:row-start-1 ${isBest ? "font-semibold text-ink-900" : "text-ink-500"}`}>
                  {t("marketRadar.sweetSpotActive", { defaultValue: "{{active}}/{{count}} active", active: band.activeCount, count: band.count })}
                </span>
              </button>
              {isOpen && (
                <ul className="mt-1 mb-2 ml-6 divide-y divide-ink-100 rounded-lg border border-ink-100">
                  {band.listings.slice(0, 5).map((listing) => (
                    <li key={`${listing.title}-${listing.price}-${listing.ageDays}`} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                      {listing.url
                        ? <a className="truncate text-blue-700 dark:text-blue-300 hover:underline" href={listing.url} target="_blank" rel="noreferrer" title={listing.title}>{listing.title}</a>
                        : <span className="truncate text-ink-700" title={listing.title}>{listing.title}</span>}
                      <span className="shrink-0 text-ink-500 tabular-nums">
                        {money(listing.price)}{unit} · {t("marketRadar.sweetSpotFav", { defaultValue: "{{value}} fav/mo", value: listing.favoritesPer30Days })}
                      </span>
                    </li>
                  ))}
                  {band.listings.length > 5 && (
                    <li className="px-3 py-1.5 text-[11px] text-ink-400">{t("marketRadar.sweetSpotMoreListings", { defaultValue: "+{{count}} more in this band — all listings are in the table below.", count: band.listings.length - 5 })}</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {details && (
        <>
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((open) => !open)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            <ChevronRight className={`size-3.5 transition-transform ${showDetails ? "rotate-90" : ""}`} />
            {showDetails
              ? t("marketRadar.hideListings", { defaultValue: "Hide every listing" })
              : t("marketRadar.showListings", { defaultValue: "Show every listing on a chart" })}
          </button>
          {showDetails && <div className="mt-3 border-t border-ink-100 pt-3">{details}</div>}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Seasonal window */

type SeasonalEvent = { id: string; name: string; pattern: RegExp; dateIn: (year: number) => Date };

const nthWeekday = (year: number, month: number, weekday: number, n: number) => {
  const first = new Date(year, month, 1);
  return new Date(year, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
};

/** Western Easter Sunday (anonymous Gregorian algorithm). */
const easter = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// US gifting occasions, since the dataset is Etsy US. Patterns match niche and listing wording.
const seasonalEvents: SeasonalEvent[] = [
  { id: "valentines", name: "Valentine's Day", pattern: /valentine/, dateIn: (y) => new Date(y, 1, 14) },
  { id: "hundredDays", name: "100 Days of School", pattern: /100 days of school/, dateIn: (y) => new Date(y, 1, 10) },
  { id: "stPatricks", name: "St. Patrick's Day", pattern: /st\.? patrick|shamrock/, dateIn: (y) => new Date(y, 2, 17) },
  { id: "easter", name: "Easter", pattern: /easter|bunny/, dateIn: easter },
  { id: "teacherAppreciation", name: "Teacher Appreciation Week", pattern: /teacher appreciation/, dateIn: (y) => nthWeekday(y, 4, 1, 1) },
  { id: "mothersDay", name: "Mother's Day", pattern: /mother'?s day|mothers day/, dateIn: (y) => nthWeekday(y, 4, 0, 2) },
  { id: "graduation", name: "Graduation", pattern: /graduat|senior|class of|class reunion/, dateIn: (y) => new Date(y, 4, 25) },
  { id: "pride", name: "Pride Month", pattern: /pride/, dateIn: (y) => new Date(y, 5, 1) },
  { id: "fathersDay", name: "Father's Day", pattern: /father'?s day|fathers day/, dateIn: (y) => nthWeekday(y, 5, 0, 3) },
  { id: "fourthOfJuly", name: "Fourth of July", pattern: /fourth of july|4th of july|america|patriotic/, dateIn: (y) => new Date(y, 6, 4) },
  { id: "backToSchool", name: "Back to School", pattern: /first day of school|back to school|kindergarten/, dateIn: (y) => new Date(y, 7, 15) },
  { id: "halloween", name: "Halloween", pattern: /halloween|spooky|ghost|skeleton|witch/, dateIn: (y) => new Date(y, 9, 31) },
  { id: "thanksgiving", name: "Thanksgiving", pattern: /thanksgiving|turkey/, dateIn: (y) => nthWeekday(y, 10, 4, 4) },
  { id: "christmas", name: "Christmas", pattern: /christmas|xmas|ugly sweater|santa|holiday/, dateIn: (y) => new Date(y, 11, 25) },
  { id: "newYear", name: "New Year's Eve", pattern: /new years?|new year's/, dateIn: (y) => new Date(y, 11, 31) },
];

/** Days of lead time Etsy sellers usually need: a new listing takes weeks to rank and orders need shipping time. */
const listNowFromDays = 75;
const lastCallFromDays = 21;
const horizonDays = 120;

/** Keeps the first and last timeline labels inside a phone's narrow card. */
const phoneLabelEdge = (days: number) =>
  days / horizonDays < 0.2 ? "max-md:left-0 max-md:translate-x-0" : days / horizonDays > 0.8 ? "max-md:right-0 max-md:left-auto max-md:translate-x-0" : "";

type SeasonalWindow = {
  id: string;
  name: string;
  date: Date;
  daysAway: number;
  phase: "plan" | "listNow" | "lastCall";
  matches: SellerOpportunity[];
};

export function buildSeasonalWindows(opportunities: SellerOpportunity[], today: Date): SeasonalWindow[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const active = opportunities.filter((item) => item.state !== "ignored" && item.state !== "dismissed");
  return seasonalEvents
    .map((event) => {
      let date = event.dateIn(start.getFullYear());
      if (date < start) date = event.dateIn(start.getFullYear() + 1);
      const daysAway = Math.round((date.getTime() - start.getTime()) / 86_400_000);
      const matches = active
        .filter((item) => event.pattern.test(`${item.niche} ${item.title}`.toLowerCase()))
        .sort((a, b) => b.finalScore - a.finalScore);
      const phase: SeasonalWindow["phase"] = daysAway > listNowFromDays ? "plan" : daysAway >= lastCallFromDays ? "listNow" : "lastCall";
      return { id: event.id, name: event.name, date, daysAway, phase, matches };
    })
    // A far-off occasion with nothing in the radar is noise; a near one is shown even when empty, as a gap.
    .filter((window) => window.daysAway <= horizonDays && (window.phase !== "plan" || window.matches.length > 0))
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 4);
}

const phaseStyle: Record<SeasonalWindow["phase"], string> = {
  listNow: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30",
  lastCall: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30",
  plan: "bg-ink-100 text-ink-600 ring-ink-200",
};

/**
 * Matching runs on the source (English) opportunities, since the patterns are English;
 * `titles` maps an opportunity id to the title shown in the current language.
 */
export function SeasonalWindowCard({ opportunities, titles, locale }: { opportunities: SellerOpportunity[]; titles: Map<string, string>; locale: string }) {
  const { t } = useTranslation("common");
  // The day changes at most once per visit, so the windows only depend on the opportunities.
  const windows = useMemo(() => buildSeasonalWindows(opportunities, new Date()), [opportunities]);
  if (windows.length === 0) return null;
  const phaseLabel: Record<SeasonalWindow["phase"], string> = {
    listNow: t("marketRadar.seasonListNow", { defaultValue: "List now" }),
    lastCall: t("marketRadar.seasonLastCall", { defaultValue: "Last call" }),
    plan: t("marketRadar.seasonPlan", { defaultValue: "Start designing" }),
  };
  const phaseHint: Record<SeasonalWindow["phase"], string> = {
    listNow: t("marketRadar.seasonListNowHint", { defaultValue: "Best time to publish: new listings need weeks to rank before buyers shop." }),
    lastCall: t("marketRadar.seasonLastCallHint", { defaultValue: "Too late for new listings to rank; promote what is already live." }),
    plan: t("marketRadar.seasonPlanHint", { defaultValue: "Prepare designs and mockups so they are ready to list." }),
  };
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const position = (days: number) => `${Math.min(100, (days / horizonDays) * 100)}%`;
  // Phase zones on the timeline, in days from today.
  const zones = [
    { phase: "lastCall" as const, from: 0, to: lastCallFromDays, className: "bg-amber-200 dark:bg-amber-500/25", ends: "rounded-l-full" },
    { phase: "listNow" as const, from: lastCallFromDays, to: listNowFromDays, className: "bg-emerald-300", ends: "" },
    { phase: "plan" as const, from: listNowFromDays, to: horizonDays, className: "bg-ink-200", ends: "rounded-r-full" },
  ];

  return (
    <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
      <div className="px-5 pt-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <CalendarClock className="size-4 text-blue-600 dark:text-blue-400" />
          {t("marketRadar.seasonTitle", { defaultValue: "Seasonal window" })}
          <InfoTip text={t("marketRadar.seasonMethod", { defaultValue: "US gifting occasions in the next {{days}} days. Products are matched by the words in their niche and title (for example christmas, xmas, ugly sweater). The lead times are common Etsy practice: a new listing needs weeks to rank before buyers shop.", days: horizonDays })} />
        </p>
      </div>

      {/* One timeline instead of a hint per card: the phase of every occasion reads off its position. */}
      <div className="px-5 pt-8 pb-2">
        <div className="relative h-2.5 rounded-full">
          {zones.map((zone) => (
            <span key={zone.phase} className={`absolute inset-y-0 ${zone.ends} ${zone.className}`} style={{ left: position(zone.from), width: `${((zone.to - zone.from) / horizonDays) * 100}%` }} />
          ))}
          {windows.map((window, index) => (
            <span key={window.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: position(window.daysAway) }}>
              <span className="block size-3.5 rounded-full border-2 border-card bg-ink-800 shadow" />
              {/* Neighbouring occasions alternate above and below so their labels do not overlap. */}
              <span className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap text-ink-700 ${phoneLabelEdge(window.daysAway)} ${index % 2 === 0 ? "bottom-5" : "top-5"}`}>
                {t(`marketRadar.season.${window.id}`, { defaultValue: window.name })}
              </span>
            </span>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-500">
          <span className="font-semibold text-ink-700">{t("marketRadar.seasonToday", { defaultValue: "Today" })} →</span>
          {zones.map((zone) => (
            <span key={zone.phase} className="flex items-center gap-1.5">
              <span className={`h-2 w-4 rounded-sm ${zone.className}`} />
              <span className="font-semibold text-ink-700">{phaseLabel[zone.phase]}</span>
              <span className="max-md:hidden">{phaseHint[zone.phase]}</span>
              <span className="md:hidden"><InfoTip text={phaseHint[zone.phase]} label={phaseLabel[zone.phase]} /></span>
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
        {windows.map((window) => (
          <li key={window.id} className="grid gap-2 px-5 py-3 max-sm:grid-cols-[minmax(0,1fr)] max-md:px-4 sm:grid-cols-[4.5rem_minmax(0,12rem)_1fr] sm:items-center sm:gap-4">
            <div className="flex items-baseline gap-2 sm:block">
              <p className="text-sm font-bold text-ink-900 tabular-nums">{dateFormat.format(window.date)}</p>
              <p className="text-[11px] text-ink-500 tabular-nums">{t("marketRadar.seasonDaysAway", { defaultValue: "in {{count}} days", count: window.daysAway })}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-ink-900">{t(`marketRadar.season.${window.id}`, { defaultValue: window.name })}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${phaseStyle[window.phase]}`}>{phaseLabel[window.phase]}</span>
            </div>
            {window.matches.length === 0 ? (
              <p className="text-xs text-ink-400">
                {window.phase === "lastCall"
                  ? t("marketRadar.seasonNoMatchLate", { defaultValue: "No product in your radar, and too late to start one." })
                  : t("marketRadar.seasonNoMatchGap", { defaultValue: "No product in your radar yet: a gap worth filling." })}
              </p>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {window.matches.slice(0, 3).map((item) => {
                  const title = titles.get(item.id) ?? item.title;
                  const score = Math.round(item.finalScore);
                  return (
                    <span key={item.id} title={title} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-ink-50 py-0.5 pr-0.5 pl-2.5 text-xs text-ink-700 ring-1 ring-ink-200 sm:max-w-80">
                      <span className="truncate">{title}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${score >= 75 ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-ink-200 text-ink-700"}`}>
                        {t("marketRadar.seasonScore", { defaultValue: "score {{value}}", value: score })}
                      </span>
                    </span>
                  );
                })}
                {window.matches.length > 3 && (
                  <span className="text-[11px] text-ink-400">{t("marketRadar.seasonMore", { defaultValue: "+{{count}} more", count: window.matches.length - 3 })}</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
