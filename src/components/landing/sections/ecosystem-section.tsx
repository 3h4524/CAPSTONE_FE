import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ECOSYSTEM_CONTENT, ECOSYSTEM_FEATURES } from "@/data/landing-content";
import { cn } from "@/utils/cn";

export const EcosystemSection = () => {
  return (
    <section id="features" className="bg-muted/40 scroll-mt-16 border-y py-16 md:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div className="flex flex-col items-start gap-4 self-start lg:sticky lg:top-24">
          <span className="text-primary text-xs font-semibold tracking-widest uppercase">
            {ECOSYSTEM_CONTENT.eyebrow}
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {ECOSYSTEM_CONTENT.title}
          </h2>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            {ECOSYSTEM_CONTENT.description}
          </p>
          <Button variant="outline" asChild>
            <Link href={ECOSYSTEM_CONTENT.cta.href}>
              {ECOSYSTEM_CONTENT.cta.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ECOSYSTEM_FEATURES.map((feature, index) => (
            <Card
              key={feature.title}
              className={cn(
                "gap-3 p-5 transition-transform duration-300 motion-safe:hover:-translate-y-1",
                index === ECOSYSTEM_FEATURES.length - 1 && "sm:col-span-2"
              )}
            >
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
                <feature.icon
                  className="size-5"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};
