import { Clock, Zap } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import {
  APCS_ROWS,
  COMPARISON_CONTENT,
  MANUAL_ROWS,
} from "@/data/landing-content";

export const ComparisonSection = () => {
  return (
    <section className="bg-muted/40 border-y py-16 md:py-24">
      <Container className="max-w-4xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {COMPARISON_CONTENT.title}
          </h2>
          <p className="text-muted-foreground mt-4">
            {COMPARISON_CONTENT.description}
          </p>
        </div>
        <div className="bg-card grid overflow-hidden rounded-lg border shadow-sm md:grid-cols-2">
          <div className="bg-muted/60 border-b p-6 md:border-r md:border-b-0 md:p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Clock
                className="text-muted-foreground size-5"
                strokeWidth={2}
                aria-hidden="true"
              />
              {COMPARISON_CONTENT.manualTitle}
            </h3>
            <ul className="mt-6 flex flex-col">
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
            <div className="border-border/60 mt-6 border-t pt-6">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Total time invested
              </p>
              <p className="mt-1 font-mono text-5xl font-bold tracking-tight">
                {COMPARISON_CONTENT.manualTotal.value}
                <span className="text-muted-foreground ml-2 font-sans text-lg font-medium">
                  {COMPARISON_CONTENT.manualTotal.unit}
                </span>
              </p>
            </div>
          </div>
          <div className="bg-primary text-primary-foreground p-6 md:p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="size-5" strokeWidth={2} aria-hidden="true" />
              {COMPARISON_CONTENT.apcsTitle}
            </h3>
            <ul className="mt-6 flex flex-col">
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
            <div className="border-primary-foreground/15 mt-6 border-t pt-6">
              <p className="text-primary-foreground/60 text-xs font-medium tracking-wider uppercase">
                Total time invested
              </p>
              <p className="text-primary-foreground mt-1 font-mono text-5xl font-bold tracking-tight">
                {COMPARISON_CONTENT.apcsTotal.value}
                <span className="text-primary-foreground/70 ml-2 font-sans text-lg font-medium">
                  {COMPARISON_CONTENT.apcsTotal.unit}
                </span>
              </p>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          {COMPARISON_CONTENT.footnote}
        </p>
      </Container>
    </section>
  );
};
