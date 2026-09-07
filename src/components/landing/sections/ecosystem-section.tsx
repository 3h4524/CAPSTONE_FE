import { Container } from "@/components/commons/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ECOSYSTEM_CONTENT, ECOSYSTEM_FEATURES } from "@/data/landing-content";

export const EcosystemSection = () => {
  return (
    <section id="features" className="bg-muted/40 scroll-mt-16 border-y py-16 md:py-24">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div className="flex flex-col items-start gap-4 self-start lg:sticky lg:top-24">
          <Badge variant="outline" className="tracking-widest uppercase">
            {ECOSYSTEM_CONTENT.eyebrow}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {ECOSYSTEM_CONTENT.title}
          </h2>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            {ECOSYSTEM_CONTENT.description}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ECOSYSTEM_FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="gap-3 p-5 transition-transform duration-300 motion-safe:hover:-translate-y-1"
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
