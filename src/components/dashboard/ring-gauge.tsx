import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Each tone's arc as a gradient from its light end to its deep end, with a track to match. */
const TONES = {
  brand: { from: "#60c5b7", to: "#2fae93", track: "color-mix(in srgb, #2fae93 16%, transparent)" },
  amber: { from: "#fcd34d", to: "#f59e0b", track: "color-mix(in srgb, #f59e0b 16%, transparent)" },
  rose: { from: "#fda4af", to: "#f43f5e", track: "color-mix(in srgb, #f43f5e 14%, transparent)" },
  slate: { from: "#cbd5e1", to: "#94a3b8", track: "var(--ink-100)" },
} as const;

export type RingTone = keyof typeof TONES;

type RingGaugeProps = {
  /** 0 to 100. */
  value: number;
  tone?: RingTone;
  /** What the ring measures, for screen readers. */
  label: string;
  /** Shown in the middle of the ring. */
  children?: ReactNode;
  className?: string;
};

/** A share of a whole as a ring, the figure written in its middle. */
export const RingGauge = ({ value, tone = "brand", label, children, className }: RingGaugeProps) => {
  const gradientId = `${useId().replaceAll(":", "")}-ring`;
  const clamped = Math.min(100, Math.max(0, value));
  const colors = TONES[tone];

  return (
    <div
      role="img"
      aria-label={`${label}: ${Math.round(clamped)}%`}
      className={cn("relative size-32 shrink-0", className)}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors.from} />
            <stop offset="1" stopColor={colors.to} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="9" stroke={colors.track} />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
};
