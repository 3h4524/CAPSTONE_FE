"use client";

import { useState } from "react";
import { ChevronDown, Clock, Zap } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import {
  APCS_ROWS,
  COMPARISON_CONTENT,
  MANUAL_ROWS,
} from "@/data/landing-content";
import { cn } from "@/utils/cn";

export const ComparisonSection = () => {
  // A phone leads with the two totals; the time per task opens on request.
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailClass = cn("mt-6 flex list-none flex-col p-0 max-md:mt-3", !isDetailOpen && "max-md:hidden");
  const totalClass = cn("mt-6 border-t pt-6 max-md:mt-3", isDetailOpen ? "max-md:pt-3" : "max-md:mt-3 max-md:border-t-0 max-md:pt-0");

  return (
    <section className="bg-muted/40 border-y py-12 md:py-24">
      <Container className="max-w-4xl">
        <SectionHeading
          title={COMPARISON_CONTENT.title}
          description={COMPARISON_CONTENT.description}
          className="mb-8 md:mb-12"
        />
        <div className={cn("grid gap-4 md:grid-cols-2 md:gap-6", !isDetailOpen && "max-md:grid-cols-2 max-md:gap-3")}>
          <div className="bg-card rounded-xl border p-6 max-md:p-4 md:p-8">
            <h3 className="text-brand-ink flex items-center gap-2 text-lg font-semibold max-md:text-sm">
              <Clock className="text-muted-foreground size-5" strokeWidth={2} aria-hidden="true" />
              {COMPARISON_CONTENT.manualTitle}
            </h3>
            <ul className={detailClass}>
              {MANUAL_ROWS.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-b-0"
                >
                  <span className="text-muted-foreground min-w-0">{row.label}</span>
                  <span className="shrink-0 font-semibold whitespace-nowrap">{row.value}</span>
                </li>
              ))}
            </ul>
            <div className={totalClass}>
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Total time invested
              </p>
              <p className="font-display text-brand-ink mt-1 text-5xl font-bold tracking-tight max-md:text-3xl">
                {COMPARISON_CONTENT.manualTotal.value}
                <span className="text-muted-foreground ml-2 font-sans text-lg font-medium max-md:ml-1 max-md:text-sm">
                  {COMPARISON_CONTENT.manualTotal.unit}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-surface-strong text-surface-strong-foreground relative overflow-hidden rounded-xl p-6 shadow-[0_20px_50px_-20px_rgba(39,55,80,0.6)] max-md:p-4 md:p-8">
            <span className="bg-brand/40 pointer-events-none absolute -top-20 -right-20 size-56 rounded-full blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h3 className="flex items-center gap-2 text-lg font-semibold max-md:text-sm">
                <Zap className="size-5 text-[#BFD3EE]" strokeWidth={2} aria-hidden="true" />
                {COMPARISON_CONTENT.apcsTitle}
              </h3>
              <ul className={detailClass}>
                {APCS_ROWS.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-white/10 py-3 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 text-white/70">{row.label}</span>
                    <span className="shrink-0 font-semibold whitespace-nowrap">{row.value}</span>
                  </li>
                ))}
              </ul>
              <div className={cn("border-white/10", totalClass)}>
                <p className="text-xs font-medium tracking-wider text-white/60 uppercase">
                  Total time invested
                </p>
                <p className="font-display text-surface-strong-foreground mt-1 text-5xl font-bold tracking-tight max-md:text-3xl">
                  {COMPARISON_CONTENT.apcsTotal.value}
                  <span className="ml-2 font-sans text-lg font-medium text-white/70 max-md:ml-1 max-md:text-sm">
                    {COMPARISON_CONTENT.apcsTotal.unit}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={isDetailOpen}
          className="mx-auto mt-2 flex min-h-11 items-center gap-1 text-sm font-semibold md:hidden"
          onClick={() => setIsDetailOpen((open) => !open)}
        >
          {isDetailOpen ? "Hide details" : "See details"}
          <ChevronDown className={cn("size-4 transition-transform", isDetailOpen && "rotate-180")} aria-hidden="true" />
        </button>
        <p className="text-muted-foreground mt-6 text-center text-xs max-md:mt-2">
          {COMPARISON_CONTENT.footnote}
        </p>
      </Container>
    </section>
  );
};
