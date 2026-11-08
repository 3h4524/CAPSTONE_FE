import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

type AdminMetricCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The exact value, shown on hover when `value` is rounded. */
  exactValue?: string;
  /** One line of context under the value, e.g. a change or a share. */
  context: React.ReactNode;
  /** The value over the period (optional). */
  sparkline?: number[];
  /** Progress percentage 0-100 (optional). */
  progress?: number;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  href?: string;
  className?: string;
};

/** One figure of the Dashboard's KPI strip, styled as a slim compact static card. */
export const AdminMetricCard = ({
  label,
  value,
  exactValue,
  context,
  sparkline,
  progress,
  icon: Icon,
  className = "",
}: AdminMetricCardProps) => {
  return (
    <article
      className={`relative flex min-w-0 flex-col rounded-xl border border-ink-200/80 bg-card px-3.5 py-2.5 shadow-2xs ${className}`}
    >
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="truncate text-[11px] leading-none font-medium text-ink-500 max-md:leading-tight">{label}</div>
            {Icon && (
              <Icon
                className="size-3.5 shrink-0 text-ink-400"
                aria-hidden="true"
              />
            )}
          </div>
          <div
            className="mt-1 truncate text-lg leading-tight font-bold tracking-tight text-ink-900 tabular-nums max-md:text-base md:text-[19px]"
            title={exactValue}
          >
            {value}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] leading-tight text-ink-400 max-md:text-xs max-md:whitespace-normal max-md:empty:hidden">{context}</div>
        </div>

        <div className="mt-1 flex h-3 items-end pt-0.5 max-md:empty:hidden">
          {sparkline && sparkline.length > 1 ? (
            <div className="h-2.5 w-16">
              <Sparkline points={sparkline} />
            </div>
          ) : progress !== undefined ? (
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-ink-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

/** A change against the previous period: an arrow and the percent, or a note when there is nothing to compare. */
export const Delta = ({
  percent,
  suffix,
  polarity = "higher-is-better",
}: {
  percent: number | null | undefined;
  suffix: string;
  polarity?: "higher-is-better" | "lower-is-better";
}) => {
  if (percent === null || percent === undefined)
    return <span className="text-ink-400">No earlier period to compare</span>;
  const isPositive = percent > 0;
  const isFavorable = polarity === "higher-is-better" ? isPositive : !isPositive;
  const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      {percent !== 0 && (
        <span
          className={`inline-flex items-center font-semibold ${
            isFavorable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          <Arrow className="size-2.5" aria-hidden="true" />
          {Math.abs(percent).toFixed(1)}%
        </span>
      )}
      <span>{percent === 0 ? `No change ${suffix}` : suffix}</span>
    </span>
  );
};

const Sparkline = ({ points }: { points: number[] }) => {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coordinates = points.map(
    (point, index) =>
      `${((index / (points.length - 1)) * 100).toFixed(1)},${(9 - ((point - min) / span) * 7).toFixed(1)}`
  );

  return (
    <svg
      viewBox="0 0 100 11"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coordinates.join(" ")}
      />
    </svg>
  );
};
