"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { describeAiFeature, formatUsd } from "@/helpers/seller-dashboard";
import type { AiFeatureCost } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

const FAILURE_WARNING_PERCENT = 10;

/** Theme colors matching Batch in progress and dashboard palette. */
const FEATURE_COLORS: Record<string, string> = {
  image_generation: "#2fae93",
  mockup: "#48a999",
  video: "#f4a261",
  listing: "#e07a5f",
  seo: "#e2b05a",
  integration: "#94a3b8",
};
const FALLBACK_COLOR = "#b8a99a";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// The gap between two slices, in the same units as the circumference.
const SLICE_GAP = 3;

const colorOf = (feature: string) => FEATURE_COLORS[feature] ?? FALLBACK_COLOR;

/** The spend as a donut, one slice per feature, the total written in its middle. */
const SpendDonut = ({ usage, total }: { usage: AiFeatureCost[]; total: number }) => {
  const gap = usage.length > 1 ? SLICE_GAP : 0;
  let offset = 0;

  return (
    <div
      role="img"
      aria-label={`AI spend ${formatUsd(total)}, by feature`}
      className="relative size-36 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="spend-donut-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60c5b7" />
            <stop offset="100%" stopColor="#2fae93" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="11" stroke="#e6f4f2" />
        {usage.map((feature) => {
          const length = total > 0 ? (feature.costUsd / total) * CIRCUMFERENCE : 0;
          const slice = Math.max(0, length - gap);
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={feature.feature}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="11"
              stroke={feature.feature === "image_generation" ? "url(#spend-donut-gradient)" : colorOf(feature.feature)}
              strokeDasharray={`${slice} ${CIRCUMFERENCE - slice}`}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dasharray] duration-700"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl leading-none font-semibold tracking-tight tabular-nums">
          {formatUsd(total)}
        </span>
        <span className="text-muted-foreground mt-1 text-[11px]">spent</span>
      </div>
    </div>
  );
};

/**
 * What the period's AI work cost: a donut of the spend by feature beside the call figures, then
 * each feature with its cost and share, matching the vertical layout structure in the sample image.
 */
export const AiUsagePanel = ({ usage }: { usage: AiFeatureCost[] }) => {
  const total = usage.reduce((sum, feature) => sum + feature.costUsd, 0);
  const calls = usage.reduce((sum, feature) => sum + feature.calls, 0);
  const failed = usage.reduce((sum, feature) => sum + feature.failed, 0);
  const failedPercent = calls > 0 ? (failed / calls) * 100 : 0;
  const isFailing = failedPercent >= FAILURE_WARNING_PERCENT;
  const stats = [
    { label: "Calls", value: calls.toLocaleString(), hint: "AI requests made" },
    {
      label: "Failed",
      value: `${failed.toLocaleString()} · ${failedPercent.toFixed(0)}%`,
      hint: isFailing ? "Higher than usual" : "Of all calls",
      alert: isFailing,
    },
    { label: "Avg per call", value: formatUsd(calls > 0 ? total / calls : 0), hint: "Spend ÷ calls" },
  ];

  return (
    <Card className="h-full gap-5 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">AI usage</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">Spend by feature in this period</p>
        </div>
        <Link
          href="/usage"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#c2410c] hover:underline"
        >
          Details
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {calls === 0 ? (
        <p className="text-muted-foreground flex flex-1 items-center justify-center rounded-xl bg-[#fbf7f2] p-6 text-xs">
          No AI calls in this period. Run a batch to see costs here.
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4">
            <SpendDonut usage={usage} total={total} />
            <dl className="grid w-full min-w-0 gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2",
                    stat.alert ? "bg-rose-50" : "bg-[#fbf7f2]"
                  )}
                >
                  <div className="min-w-0">
                    <dt className="text-xs font-medium">{stat.label}</dt>
                    <p
                      className={cn(
                        "text-[10px]",
                        stat.alert ? "text-rose-600" : "text-muted-foreground"
                      )}
                    >
                      {stat.hint}
                    </p>
                  </div>
                  <dd
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      stat.alert && "text-rose-600"
                    )}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <ul className="space-y-2 border-t pt-4">
            {usage.map((feature) => (
              <li key={feature.feature} className="flex items-center gap-2.5 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorOf(feature.feature) }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {describeAiFeature(feature.feature)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {feature.calls.toLocaleString()} calls
                </span>
                <span className="w-14 text-right font-semibold tabular-nums">
                  {formatUsd(feature.costUsd)}
                </span>
                <span className="text-muted-foreground w-9 text-right tabular-nums">
                  {total > 0 ? ((feature.costUsd / total) * 100).toFixed(0) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
};
