import { Check } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { BatchProcessingVisual } from "@/components/features/visuals/batch-processing-visual";
import { ListingContentVisual } from "@/components/features/visuals/listing-content-visual";
import type { FeatureDetail } from "@/types/features";

export interface DuoSectionProps {
  listing: FeatureDetail;
  batch: FeatureDetail;
}

export const DuoSection = ({ listing, batch }: DuoSectionProps) => {
  return (
    <section className="scroll-mt-32 py-14 md:py-20">
      <Container className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <article
          id={listing.id}
          className="border-border bg-background flex scroll-mt-32 flex-col gap-5 rounded-2xl border p-6 shadow-sm md:p-8 lg:col-span-3"
        >
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <listing.icon
                className="size-5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {listing.title}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {listing.description}
          </p>
          <ListingContentVisual />
          <ul className="grid gap-2 p-0 sm:grid-cols-2">
            {listing.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm">
                <Check
                  className="text-primary mt-0.5 size-4 shrink-0"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>
        </article>
        <article
          id={batch.id}
          className="border-primary/25 bg-primary/[0.04] flex scroll-mt-32 flex-col gap-5 rounded-2xl border p-6 shadow-sm md:p-8 lg:col-span-2"
        >
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <batch.icon className="size-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {batch.title}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {batch.description}
          </p>
          <BatchProcessingVisual />
          <ul className="flex flex-col gap-2 p-0">
            {batch.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>
        </article>
      </Container>
    </section>
  );
};
