"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MarketListingPoint, MarketShareTiers, MarketSupplyPoint } from "@/api/market-opportunities";

// Chart roles from the validated reference palette (light surface). The first three
// categorical slots pass the all-pairs CVD and normal-vision checks; slot 3 (aqua) is
// below 3:1 contrast, so every chart that uses it prints its values in a visible legend.
const chart = {
  series1: "#2a78d6",
  series2: "#eb6834",
  series3: "#1baf7a",
  seriesWash: "#cde2fb",
  surface: "#ffffff",
  grid: "#e1e0d9",
  axis: "#898781",
  inkPrimary: "#0b0b0b",
  inkSecondary: "#52514e",
};

const axisTick = { fill: chart.axis, fontSize: 11 };

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TooltipCard({ value, label, rows }: { value: string; label: string; rows?: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-sm font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-slate-500">{label}</p>
      {rows?.map((row) => <p key={row} className="mt-0.5 text-slate-500">{row}</p>)}
    </div>
  );
}

/** Active listings per observed day. Needs two days; with one there is no line to draw. */
export function SupplySparkline({ history }: { history: MarketSupplyPoint[] | null | undefined }) {
  const { t } = useTranslation("common");
  if (!history || history.length < 2) return null;
  const data = history.map((point) => ({ day: point.day, count: point.activeListingCount }));
  return (
    <div className="h-10 w-full" role="img" aria-label={t("marketRadar.supplyChartLabel", { defaultValue: "Active listings per day" })}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <Tooltip
            cursor={{ stroke: chart.grid, strokeWidth: 1 }}
            content={({ active, payload }) => active && payload?.[0]
              ? <TooltipCard value={Number(payload[0].value).toLocaleString()} label={new Date(String(payload[0].payload.day)).toLocaleDateString()} />
              : null}
          />
          <Area type="monotone" dataKey="count" stroke={chart.series1} strokeWidth={2} fill={chart.series1} fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Price distribution of the top listings; bins inside the typical (p25–p75) window are emphasised. */
export function PriceHistogram({ points, p25, p75 }: { points: MarketListingPoint[]; p25: number | null; p75: number | null }) {
  const { t } = useTranslation("common");
  const bins = useMemo(() => buildBins(points.map((point) => point.price), 8), [points]);
  if (bins.length === 0) return null;
  return (
    <div className="h-12 w-full" role="img" aria-label={t("marketRadar.priceChartLabel", { defaultValue: "Price distribution of top listings" })}>
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
          <Tooltip
            cursor={false}
            content={({ active, payload }) => active && payload?.[0]
              ? <TooltipCard
                  value={t("marketRadar.listingsCount", { defaultValue: "{{count}} listings", count: Number(payload[0].value) })}
                  label={`${money(payload[0].payload.from)} – ${money(payload[0].payload.to)}`}
                />
              : null}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            {bins.map((bin) => (
              <Cell
                key={bin.from}
                fill={p25 != null && p75 != null && bin.to > p25 && bin.from < p75 ? chart.series1 : chart.seriesWash}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** One whole split in two: strong shops and the rest of the shops at the top. */
export function StrongSellerBar({ strong, total }: { strong: number; total: number }) {
  const { t } = useTranslation("common");
  if (total <= 0) return null;
  const share = Math.round((strong / total) * 100);
  const label = t("marketRadar.strongSellerBarLabel", { defaultValue: "{{strong}} strong of {{total}} shops ({{share}}%)", strong, total, share });
  return (
    <div className="flex h-2 w-full gap-0.5" role="img" aria-label={label} title={label}>
      {strong > 0 && <span className="h-full rounded-full" style={{ width: `${share}%`, background: chart.series1 }} />}
      {strong < total && <span className="h-full flex-1 rounded-full" style={{ background: chart.seriesWash }} />}
    </div>
  );
}

/** Share of the top listings held by the 5 largest shops, the next 15, and everyone else. */
export function ShareDonut({ tiers }: { tiers: MarketShareTiers }) {
  const { t } = useTranslation("common");
  const data = [
    { name: t("marketRadar.tierTopFive", { defaultValue: "Top 5 shops" }), value: tiers.topFivePercent, color: chart.series1 },
    { name: t("marketRadar.tierNextFifteen", { defaultValue: "Next 15 shops" }), value: tiers.nextFifteenPercent, color: chart.series2 },
    { name: t("marketRadar.tierRest", { defaultValue: "Everyone else" }), value: tiers.restPercent, color: chart.series3 },
  ].filter((slice) => slice.value > 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              content={({ active, payload }) => active && payload?.[0]
                ? <TooltipCard value={`${payload[0].value}%`} label={String(payload[0].name)} />
                : null}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={54} startAngle={90} endAngle={-270} stroke={chart.surface} strokeWidth={2} isAnimationActive={false}>
              {data.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900">{tiers.topFivePercent}%</span>
          <span className="text-[9px] font-bold tracking-wide text-slate-500 uppercase">{t("marketRadar.topFiveShort", { defaultValue: "Top 5" })}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
              <span className="truncate">{slice.name}</span>
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">{slice.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Each top listing placed by its price and how fast it gains favorites. New listings (under 90 days)
 * are the second series, so the reader sees at which prices newcomers already gain traction.
 */
export function PriceInterestScatter({ points, p25, p75, currency }: { points: MarketListingPoint[]; p25: number | null; p75: number | null; currency: string | null }) {
  const { t } = useTranslation("common");
  // A handful of very expensive listings would squeeze every other dot against the axis,
  // so the price axis stops at the 95th percentile and the rest is reported below the chart.
  const priceCap = useMemo(() => {
    const sorted = points.map((point) => point.price).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    return niceCeiling(sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] * 1.05);
  }, [points]);
  const visible = points.filter((point) => point.price <= priceCap);
  const hiddenCount = points.length - visible.length;
  const established = visible.filter((point) => !point.isNew);
  const fresh = visible.filter((point) => point.isNew);
  const newLabel = t("marketRadar.seriesNew", { defaultValue: "New listings (under 90 days)" });
  const oldLabel = t("marketRadar.seriesEstablished", { defaultValue: "Established listings" });
  const priceAxis = currency
    ? t("marketRadar.listPriceAxisCurrency", { defaultValue: "List price before discounts ({{currency}})", currency })
    : t("marketRadar.listPriceAxis", { defaultValue: "List price before discounts" });
  const band = useMemo(() => compareBand(points, p25, p75), [points, p25, p75]);
  if (points.length === 0) return null;

  return (
    <div>
    {band && (
      <div className="mb-2 grid gap-2 sm:grid-cols-3">
        <BandStat
          label={t("marketRadar.bandInsideList", { defaultValue: "Inside typical list price ({{from}}–{{to}})", from: money(band.from), to: money(band.to) })}
          value={t("marketRadar.bandMedianFav", { defaultValue: "{{value}} fav / month", value: band.insideMedian })}
          hint={t("marketRadar.bandCount", { defaultValue: "Median of {{count}} listings", count: band.insideCount })}
          emphasis={band.insideMedian > band.outsideMedian}
        />
        <BandStat
          label={t("marketRadar.bandOutsideList", { defaultValue: "Outside typical list price" })}
          value={t("marketRadar.bandMedianFav", { defaultValue: "{{value}} fav / month", value: band.outsideMedian })}
          hint={t("marketRadar.bandCount", { defaultValue: "Median of {{count}} listings", count: band.outsideCount })}
          emphasis={band.outsideMedian > band.insideMedian}
        />
        <BandStat
          label={t("marketRadar.bandZero", { defaultValue: "No favorites yet" })}
          value={`${band.zeroPercent}%`}
          hint={t("marketRadar.bandZeroHint", { defaultValue: "{{count}} listings sit on the 0 line", count: band.zeroCount })}
        />
      </div>
    )}
    <div className="h-80 w-full [&_*:focus]:outline-none" role="img" aria-label={t("marketRadar.scatterLabel", { defaultValue: "Price against favorites per month for the top listings" })}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 12 }}>
          <CartesianGrid stroke={chart.grid} strokeWidth={1} vertical={false} />
          {p25 != null && p75 != null && (
            <ReferenceArea
              x1={p25}
              x2={p75}
              fill={chart.series1}
              fillOpacity={0.06}
              stroke="none"
              label={{ value: t("marketRadar.typicalPriceBand", { defaultValue: "Typical price (middle 50%)" }), position: "insideTop", offset: 6, fill: chart.inkSecondary, fontSize: 11 }}
            />
          )}
          <XAxis
            type="number"
            dataKey="price"
            name={t("marketRadar.listPrice", { defaultValue: "List price" })}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            domain={[0, priceCap]}
            allowDataOverflow
            tickFormatter={(value: number) => compact(value)}
            label={{ value: priceAxis, position: "insideBottom", offset: -16, fill: chart.inkSecondary, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="favoritesPer30Days"
            name={t("marketRadar.favoritesPerMonth", { defaultValue: "Favorites / month" })}
            scale="sqrt"
            domain={[0, "dataMax"]}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => compact(value)}
            label={{ value: t("marketRadar.favoritesAxis", { defaultValue: "Favorites / month" }), angle: -90, position: "insideLeft", offset: 0, style: { textAnchor: "middle" }, fill: chart.inkSecondary, fontSize: 11 }}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as MarketListingPoint | undefined) : undefined;
              return point
                ? <TooltipCard
                    value={t("marketRadar.favoritesPerMonthValue", { defaultValue: "{{value}} favorites / month", value: point.favoritesPer30Days })}
                    label={point.title}
                    rows={[
                      `${money(point.price)} · ${t("marketRadar.daysOldValue", { defaultValue: "{{value}} days old", value: point.ageDays })}`,
                      ...(point.url ? [t("marketRadar.clickToOpen", { defaultValue: "Click to open on Etsy" })] : []),
                    ]}
                  />
                : null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
          />
          <Scatter name={oldLabel} data={established} fill={chart.series1} stroke={chart.surface} strokeWidth={2} isAnimationActive={false} shape="circle" cursor="pointer" onClick={openListing} />
          <Scatter name={newLabel} data={fresh} fill={chart.series2} stroke={chart.surface} strokeWidth={2} isAnimationActive={false} shape="circle" cursor="pointer" onClick={openListing} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-1 text-[11px] text-slate-500">
      {t("marketRadar.listPriceNote", { defaultValue: "Prices are the list prices Etsy reports, before sales and coupons. Shops running a sale charge less at checkout, and buyers abroad may see a converted price with VAT added." })}
    </p>
    {hiddenCount > 0 && (
      <p className="mt-1 text-[11px] text-slate-400">
        {t("marketRadar.scatterHidden", { defaultValue: "{{count}} listing(s) priced above {{price}} are not shown; they are in the table.", count: hiddenCount, price: compact(priceCap) })}
      </p>
    )}
    </div>
  );
}

/** Median interest inside versus outside the typical price window, so the shaded band says something. */
function compareBand(points: MarketListingPoint[], p25: number | null, p75: number | null) {
  if (p25 == null || p75 == null || points.length === 0) return null;
  const inside = points.filter((point) => point.price >= p25 && point.price <= p75).map((point) => point.favoritesPer30Days);
  const outside = points.filter((point) => point.price < p25 || point.price > p75).map((point) => point.favoritesPer30Days);
  const zeroCount = points.filter((point) => point.favoritesPer30Days === 0).length;
  return {
    from: p25,
    to: p75,
    insideCount: inside.length,
    outsideCount: outside.length,
    insideMedian: median(inside),
    outsideMedian: median(outside),
    zeroCount,
    zeroPercent: Math.round((zeroCount / points.length) * 100),
  };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
}

function BandStat({ label, value, hint, emphasis }: { label: string; value: string; hint: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${emphasis ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
      <p className="truncate text-[11px] text-slate-500" title={label}>{label}</p>
      <p className="text-base font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

/** Opens the clicked dot's public Etsy listing in a new tab. */
function openListing(dot: { payload?: MarketListingPoint }) {
  const url = dot.payload?.url;
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

/** Rounds up to 1, 2 or 5 times a power of ten, so the axis ends on a clean tick. */
function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
  return step * magnitude;
}

export type NicheMapPoint = {
  niche: string;
  /** Percent of the top shops that already gain 3+ favorites a month: how crowded the top is. */
  strongSharePercent: number;
  /** Median favorites a month per top listing: how much buyers engage. */
  favoritesPer30Days: number;
  activeListingCount: number | null;
  isOpening: boolean;
};

/**
 * Niches placed by competition (x) against buyer interest (y). The shaded top-left quadrant is
 * where buyers engage more than the median niche while fewer top shops are strong.
 */
export function NicheMapChart({
  points,
  splitX,
  splitY,
  selected,
  onSelect,
}: {
  points: NicheMapPoint[];
  splitX: number;
  splitY: number;
  selected: string | null;
  onSelect: (niche: string) => void;
}) {
  const { t } = useTranslation("common");
  const maxX = niceCeiling(Math.max(splitX * 2, ...points.map((point) => point.strongSharePercent), 10));
  const maxY = niceCeiling(Math.max(splitY * 2, ...points.map((point) => point.favoritesPer30Days), 1));

  return (
    <div className="h-72 w-full [&_*:focus]:outline-none" role="img" aria-label={t("marketRadar.nicheMapLabel", { defaultValue: "Tracked niches by competition and buyer interest" })}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 12 }}>
          <CartesianGrid stroke={chart.grid} strokeWidth={1} vertical={false} />
          <ReferenceArea
            x1={0}
            x2={splitX}
            y1={splitY}
            y2={maxY}
            fill={chart.series3}
            fillOpacity={0.08}
            stroke="none"
            label={{ value: t("marketRadar.nicheMapOpening", { defaultValue: "Interest high, competition low" }), position: "insideTopLeft", offset: 8, fill: chart.inkSecondary, fontSize: 11 }}
          />
          <XAxis
            type="number"
            dataKey="strongSharePercent"
            domain={[0, maxX]}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            tickFormatter={(value: number) => `${value}%`}
            label={{ value: t("marketRadar.nicheMapX", { defaultValue: "Strong shops among top sellers (competition)" }), position: "insideBottom", offset: -16, fill: chart.inkSecondary, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="favoritesPer30Days"
            scale="sqrt"
            domain={[0, maxY]}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => compact(value)}
            label={{ value: t("marketRadar.nicheMapY", { defaultValue: "Median favorites / month" }), angle: -90, position: "insideLeft", offset: 0, style: { textAnchor: "middle" }, fill: chart.inkSecondary, fontSize: 11 }}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as NicheMapPoint | undefined) : undefined;
              return point
                ? <TooltipCard
                    value={point.niche}
                    label={t("marketRadar.nicheMapTooltip", { defaultValue: "{{fav}} favorites / month · {{share}}% strong shops", fav: point.favoritesPer30Days, share: point.strongSharePercent })}
                    rows={[
                      ...(point.activeListingCount == null ? [] : [t("marketRadar.nicheMapListings", { defaultValue: "{{value}} active listings", value: compact(point.activeListingCount) })]),
                      t("marketRadar.nicheMapClick", { defaultValue: "Click to see this niche" }),
                    ]}
                  />
                : null;
            }}
          />
          <Scatter
            data={points}
            isAnimationActive={false}
            shape="circle"
            cursor="pointer"
            onClick={(dot: { payload?: NicheMapPoint }) => { if (dot.payload) onSelect(dot.payload.niche); }}
          >
            {points.map((point) => (
              <Cell
                key={point.niche}
                fill={point.isOpening ? chart.series3 : chart.series1}
                stroke={point.niche === selected ? chart.inkPrimary : chart.surface}
                strokeWidth={point.niche === selected ? 3 : 2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Three-step meter for an ordered level; the label beside it carries the word. */
export function LevelMeter({ level }: { level: string }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3].map((step) => (
        <span key={step} className="h-1.5 w-4 rounded-full" style={{ background: step <= filled ? chart.series1 : chart.grid }} />
      ))}
    </span>
  );
}

function buildBins(values: number[], count: number) {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  // Trim the top 5% so one luxury listing does not squeeze every other bar into one bin.
  const max = sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)] ?? sorted[sorted.length - 1];
  const min = sorted[0];
  const width = Math.max((max - min) / count, 0.01);
  const bins = Array.from({ length: count }, (_, index) => ({ from: min + index * width, to: min + (index + 1) * width, count: 0 }));
  for (const value of sorted) {
    const index = Math.min(count - 1, Math.floor((Math.min(value, max) - min) / width));
    bins[index].count += 1;
  }
  return bins;
}
