import { Check } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { PlatformIntegrationsVisual } from "@/components/features/visuals/platform-integrations-visual";
import type { FeatureDetail } from "@/types/features";

export interface PlatformsSectionProps {
  feature: FeatureDetail;
}

export const PlatformsSection = ({ feature }: PlatformsSectionProps) => {
  return (
    <section id={feature.id} className="scroll-mt-32 pb-14 md:pb-20">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:order-2">
          <PlatformIntegrationsVisual />
        </div>
        <div className="flex flex-col items-start gap-4 lg:order-1">
          <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
            <feature.icon className="size-6" strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-5xl md:leading-[1.05]">
            {feature.title}
          </h2>
          <p className="border-primary text-muted-foreground border-l-2 pl-4 leading-relaxed md:text-lg">
            {feature.tagline}. {feature.description}
          </p>
          <ul className="flex flex-col gap-2.5 p-0">
            {feature.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm">
                <Check
                  className="text-primary mt-0.5 size-4 shrink-0"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
};
