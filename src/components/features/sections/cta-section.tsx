import Link from "next/link";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { FEATURES_CTA_CONTENT } from "@/data/features-content";

/** Same dark block as the landing page's closing call to action, so both pages end alike. */
export const CtaSection = () => {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="bg-surface-strong text-surface-strong-foreground relative mx-auto max-w-4xl overflow-hidden rounded-2xl px-6 py-10 text-center shadow-[0_24px_60px_-24px_rgba(39,55,80,0.55)] md:p-14">
          <span className="bg-dot-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
          <span className="bg-brand/40 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-4">
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {FEATURES_CTA_CONTENT.title}
            </h2>
            <p className="max-w-xl leading-relaxed text-balance text-white/70">{FEATURES_CTA_CONTENT.description}</p>
            <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                size="lg"
                className="bg-surface-strong-foreground text-surface-strong hover:bg-surface-strong-foreground/90"
                asChild
              >
                <a href={FEATURES_CTA_CONTENT.primaryCta.href}>{FEATURES_CTA_CONTENT.primaryCta.label}</a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
              >
                <Link href={FEATURES_CTA_CONTENT.secondaryCta.href}>{FEATURES_CTA_CONTENT.secondaryCta.label}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
