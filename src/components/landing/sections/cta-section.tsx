"use client";

import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { CTA_CONTENT } from "@/data/landing-content";

export const CtaSection = () => {
  const { t } = useTranslation("common");
  return (
    <section id="signup" className="scroll-mt-16 pb-12 md:pb-24">
      <Container>
        <div className="bg-surface-strong text-surface-strong-foreground relative overflow-hidden rounded-2xl px-6 py-10 text-center shadow-[0_24px_60px_-24px_rgba(39,55,80,0.55)] md:p-16">
          <span className="bg-dot-pattern pointer-events-none absolute inset-0" aria-hidden="true" />
          <span className="bg-brand/40 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {t("landing.cta.title", { defaultValue: CTA_CONTENT.title })}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              {t("landing.cta.description", { defaultValue: CTA_CONTENT.description })}
            </p>
            <Button
              size="lg"
              className="bg-surface-strong-foreground text-surface-strong hover:bg-surface-strong-foreground/90 mt-6 md:mt-8"
              asChild
            >
              <a href={CTA_CONTENT.primaryCta.href}>
                {t("landing.cta.primary", { defaultValue: CTA_CONTENT.primaryCta.label })}
              </a>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
};
