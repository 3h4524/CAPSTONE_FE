import { Container } from "@/components/commons/layout/container";
import { Card } from "@/components/ui/card";
import { BENEFITS } from "@/data/landing-content";
import { cn } from "@/utils/cn";

export const BenefitsSection = () => {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Outstanding Benefits
          </h2>
          <p className="text-muted-foreground mt-4">
            An integrated solution from generation to store management, helping
            your POD business grow sustainably.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <Card
              key={benefit.title}
              className={cn(
                "p-6 transition-transform duration-300 motion-safe:hover:-translate-y-1 md:p-8",
                benefit.isFeatured &&
                  "bg-primary text-primary-foreground border-primary md:col-span-2 md:flex-row md:items-center md:gap-8"
              )}
            >
              <div
                className={cn(
                  "bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-md",
                  benefit.isFeatured && "bg-primary-foreground/15 text-primary-foreground"
                )}
              >
                <benefit.icon
                  className="size-6"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-xl font-semibold">
                  {benefit.title}
                </h3>
                <p
                  className={cn(
                    "text-muted-foreground text-sm leading-relaxed md:text-base",
                    benefit.isFeatured && "text-primary-foreground/70"
                  )}
                >
                  {benefit.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};
