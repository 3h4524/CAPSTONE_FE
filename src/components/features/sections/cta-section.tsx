import Link from "next/link";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FEATURES_CTA_CONTENT } from "@/data/features-content";

export const CtaSection = () => {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <Card className="bg-primary text-primary-foreground border-primary mx-auto flex max-w-3xl flex-col items-center gap-4 p-8 text-center md:p-12">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {FEATURES_CTA_CONTENT.title}
          </h2>
          <p className="text-primary-foreground/70 max-w-xl leading-relaxed">
            {FEATURES_CTA_CONTENT.description}
          </p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="secondary" size="lg" asChild>
              <Link href={FEATURES_CTA_CONTENT.primaryCta.href}>
                {FEATURES_CTA_CONTENT.primaryCta.label}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="border-primary-foreground/30 text-primary-foreground hover:border-primary-foreground hover:text-primary-foreground bg-transparent"
            >
              <Link href={FEATURES_CTA_CONTENT.secondaryCta.href}>
                {FEATURES_CTA_CONTENT.secondaryCta.label}
              </Link>
            </Button>
          </div>
        </Card>
      </Container>
    </section>
  );
};
