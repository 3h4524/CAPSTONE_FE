import { Check } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { DesignGenerationVisual } from "@/components/features/visuals/design-generation-visual";
import { Badge } from "@/components/ui/badge";
import type { FeatureDetail } from "@/types/features";

export interface SpotlightSectionProps {
  feature: FeatureDetail;
}

export const SpotlightSection = ({ feature }: SpotlightSectionProps) => {
  return (
    <section id={feature.id} className="scroll-mt-32 pt-12 pb-14 md:pt-16 md:pb-20">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
            <feature.icon className="size-6" strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-5xl md:leading-[1.05]">
            {feature.title}
          </h2>
          <Badge variant="secondary">{feature.tagline}</Badge>
          <p className="text-muted-foreground max-w-[65ch] leading-relaxed">
            {feature.description}
          </p>
          <ul className="mt-1 grid gap-2.5 p-0 sm:grid-cols-2">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
        <DesignGenerationVisual />
      </Container>
    </section>
  );
};
