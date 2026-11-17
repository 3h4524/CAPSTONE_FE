"use client";

import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ProductionChartTooltip } from "@/components/dashboard/production-chart-tooltip";
import { Card } from "@/components/ui/card";
import { formatTrendDay } from "@/helpers/seller-dashboard";
import type { TrendPoint } from "@/types/seller-dashboard";

const SERIES = [
  { key: "products", labelKey: "dashboard.chart.added", color: "#4f75b3" },
  { key: "finished", labelKey: "dashboard.chart.finished", color: "#48a999" },
  { key: "failed", labelKey: "dashboard.chart.failed", color: "#e07a5f" },
] as const;

/** Products added, finished and failed each day of the period, as stacked-free layered areas. */
export const ProductionChart = ({ trend }: { trend: TrendPoint[] }) => {
  const { t, i18n } = useTranslation("common");
  const formatCount = (value: number) => new Intl.NumberFormat(i18n.language).format(value);
  const total = trend.reduce((sum, point) => sum + point.products, 0);
  const finished = trend.reduce((sum, point) => sum + point.finished, 0);

  return (
    <Card className="h-full gap-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("dashboard.chart.title")}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="text-ink-800 font-semibold">{t("dashboard.chart.addedCount", { count: total })}</span>
            {" · "}
            {t("dashboard.chart.finishedCount", { count: finished })}
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs">
          {SERIES.map((series) => (
            <li key={series.key} className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: series.color }} />
              {t(series.labelKey)}
            </li>
          ))}
        </ul>
      </div>
      <div
        className="min-h-80 flex-1"
        role="img"
        aria-label={t("dashboard.chart.ariaLabel", { total: formatCount(total) })}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
            <defs>
              {SERIES.map((series) => (
                <linearGradient key={series.key} id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatTrendDay}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ProductionChartTooltip />} />
            {SERIES.map((series) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2}
                fill={`url(#fill-${series.key})`}
                activeDot={{ r: 4 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
