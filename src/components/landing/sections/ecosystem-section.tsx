import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import { FEATURE_VISUALS } from "@/components/landing/visuals/feature-visuals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ECOSYSTEM_CONTENT, ECOSYSTEM_FEATURES, type FeatureVisualId } from "@/data/landing-content";
import { cn } from "@/utils/cn";

/**
 * Where each tile sits in the bento grid. On a large screen: design spans two columns, video runs
 * down two rows beside it, listing and batch share the second row, platforms takes the last row.
 */
const TILE_LAYOUT: Record<FeatureVisualId, string> = {
  design: "lg:col-span-2",
  video: "lg:row-span-2",
  listing: "",
  batch: "",
  platforms: "md:col-span-2 lg:col-span-3",
};

export const EcosystemSection = () => {
  return (
    <section id="features" className="bg-muted/40 scroll-mt-16 border-y py-12 md:py-24">
      <Container>
        <SectionHeading
          title={ECOSYSTEM_CONTENT.title}
          description={ECOSYSTEM_CONTENT.description}
          className="mb-10 md:mb-14"
        >
          <Button variant="outline" asChild>
            <Link href={ECOSYSTEM_CONTENT.cta.href}>
              {ECOSYSTEM_CONTENT.cta.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM_FEATURES.map((feature) => {
            const Visual = FEATURE_VISUALS[feature.id];
            return (
              <Card
                key={feature.id}
                className={cn(
                  "gap-5 p-5 shadow-none transition-shadow duration-300 hover:shadow-md md:p-6",
                  TILE_LAYOUT[feature.id]
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="bg-brand-soft text-brand-ink flex size-10 shrink-0 items-center justify-center rounded-md">
                    <feature.icon className="size-5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-brand-ink font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
                <div
                  className={feature.id === "video" ? "flex flex-1 items-center justify-center" : "mt-auto"}
                  aria-hidden="true"
                >
                  <Visual />
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
