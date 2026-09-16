import { Check } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { VideoCreationVisual } from "@/components/features/visuals/video-creation-visual";
import type { FeatureDetail } from "@/types/features";

export interface ShowcaseSectionProps {
  feature: FeatureDetail;
}

export const ShowcaseSection = ({ feature }: ShowcaseSectionProps) => {
  return (
    <section
      id={feature.id}
      className="bg-muted/40 scroll-mt-32 border-y py-14 md:py-20"
    >
      <Container className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display flex items-center gap-4 text-3xl font-bold tracking-tight text-balance md:text-5xl">
            <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl md:size-14">
              <feature.icon
                className="size-6 md:size-7"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            {feature.title}
          </h2>
          <p className="text-muted-foreground max-w-[65ch] leading-relaxed md:text-lg">
            {feature.description}
          </p>
        </div>
        <div className="mx-auto w-full max-w-4xl">
          <VideoCreationVisual />
        </div>
        <ul className="grid gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {feature.bullets.map((bullet) => (
            <li
              key={bullet}
              className="border-border bg-background flex items-start gap-2.5 rounded-xl border p-4 text-sm"
            >
              <Check
                className="text-primary mt-0.5 size-4 shrink-0"
                strokeWidth={3}
                aria-hidden="true"
              />
              {bullet}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
