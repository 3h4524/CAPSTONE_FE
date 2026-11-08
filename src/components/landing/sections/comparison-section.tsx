"use client";

import { useState } from "react";
import { ChevronDown, Clock, Zap } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import {
  APCS_ROWS,
  COMPARISON_CONTENT,
  MANUAL_ROWS,
} from "@/data/landing-content";
import { cn } from "@/utils/cn";

export const ComparisonSection = () => {
  // A phone leads with the two totals; the time per task opens on request.
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailClass = cn("mt-6 flex flex-col max-md:mt-3", !isDetailOpen && "max-md:hidden");
  const totalClass = cn("mt-6 pt-6 max-md:mt-3", isDetailOpen ? "max-md:pt-3" : "max-md:mt-3 max-md:border-t-0 max-md:pt-0");

  return (
    <section className="bg-muted/40 border-y py-10 md:py-24">
      <Container className="max-w-4xl">
        <div className="mx-auto mb-6 max-w-2xl text-center md:mb-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {COMPARISON_CONTENT.title}
          </h2>
          <p className="text-muted-foreground mt-4">
            {COMPARISON_CONTENT.description}
          </p>
        </div>
        <div className={cn("bg-card grid overflow-hidden rounded-lg border shadow-sm md:grid-cols-2", !isDetailOpen && "max-md:grid-cols-2")}>
          <div className={cn("bg-muted/60 p-6 max-md:p-4 md:border-r md:border-b-0 md:p-8", isDetailOpen && "border-b")}>
            <h3 className="flex items-center gap-2 text-lg font-semibold max-md:text-sm">
              <Clock
                className="text-muted-foreground size-5"
                strokeWidth={2}
                aria-hidden="true"
              />
              {COMPARISON_CONTENT.manualTitle}
            </h3>
            <ul className={detailClass}>
              {MANUAL_ROWS.map((row) => (
                <li
                  key={row.label}
                  className="border-border/60 flex items-center justify-between gap-4 border-b py-3 text-sm last:border-b-0"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold whitespace-nowrap">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className={cn("border-border/60 border-t", totalClass)}>
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Total time invested
              </p>
              <p className="mt-1 font-mono text-5xl font-bold tracking-tight max-md:text-3xl">
                {COMPARISON_CONTENT.manualTotal.value}
                <span className="text-muted-foreground ml-2 font-sans text-lg font-medium max-md:ml-1 max-md:text-sm">
                  {COMPARISON_CONTENT.manualTotal.unit}
                </span>
              </p>
            </div>
          </div>
          <div className="bg-primary text-primary-foreground p-6 max-md:p-4 md:p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold max-md:text-sm">
              <Zap className="size-5" strokeWidth={2} aria-hidden="true" />
              {COMPARISON_CONTENT.apcsTitle}
            </h3>
            <ul className={detailClass}>
              {APCS_ROWS.map((row) => (
                <li
                  key={row.label}
                  className="border-primary-foreground/15 flex items-center justify-between gap-4 border-b py-3 text-sm last:border-b-0"
                >
                  <span className="text-primary-foreground/70">{row.label}</span>
                  <span className="font-semibold whitespace-nowrap">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className={cn("border-primary-foreground/15 border-t", totalClass)}>
              <p className="text-primary-foreground/60 text-xs font-medium tracking-wider uppercase">
                Total time invested
              </p>
              <p className="text-primary-foreground mt-1 font-mono text-5xl font-bold tracking-tight max-md:text-3xl">
                {COMPARISON_CONTENT.apcsTotal.value}
                <span className="text-primary-foreground/70 ml-2 font-sans text-lg font-medium max-md:ml-1 max-md:text-sm">
                  {COMPARISON_CONTENT.apcsTotal.unit}
                </span>
              </p>
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
