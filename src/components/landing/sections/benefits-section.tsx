"use client";

import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { Card } from "@/components/ui/card";
import { BENEFITS } from "@/data/landing-content";
import { cn } from "@/utils/cn";

export const BenefitsSection = () => {
  const { t } = useTranslation("common");
  return (
    <section className="py-10 md:py-24">
      <Container>
        <div className="mx-auto mb-6 max-w-2xl text-center md:mb-12">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {t("landing.benefits.title")}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t("landing.benefits.description")}
          </p>
        </div>
        {/* A row to swipe on a phone; the next card peeks in at the edge. */}
        <div className="grid gap-6 max-md:-mx-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:scroll-px-4 max-md:gap-3 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:[scrollbar-width:none] md:grid-cols-2 max-md:[&::-webkit-scrollbar]:hidden">
          {BENEFITS.map((benefit, index) => (
            <Card
              key={benefit.title}
              className={cn(
                "p-6 transition-transform duration-300 motion-safe:hover:-translate-y-1 max-md:w-[78%] max-md:shrink-0 max-md:snap-start max-md:gap-3 max-md:p-4 md:p-8",
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
                <h3 className="font-display text-xl font-semibold max-md:text-base">
                  {t(`landing.benefits.items.${index}.title`, { defaultValue: benefit.title })}
                </h3>
                <p
                  className={cn(
                    "text-muted-foreground text-sm leading-relaxed md:text-base",
                    benefit.isFeatured && "text-primary-foreground/70"
                  )}
                >
                  {t(`landing.benefits.items.${index}.description`, { defaultValue: benefit.description })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
};
