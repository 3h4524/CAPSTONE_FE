"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { HeroPreview } from "@/components/landing/visuals/hero-preview";
import { Button } from "@/components/ui/button";
import { HERO_CONTENT } from "@/data/landing-content";

export const HeroSection = () => {
  const { t } = useTranslation("common");
  return (
    <section className="bg-landing-glow overflow-hidden border-b">
      <Container className="grid items-center gap-12 py-16 md:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <span className="bg-brand-soft text-brand-ink inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            {t("landing.hero.eyebrow", { defaultValue: HERO_CONTENT.eyebrow })}
          </span>
          <h1 className="font-display text-brand-ink text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            {t("landing.hero.titleLead", { defaultValue: HERO_CONTENT.titleLead })}{" "}
            <span className="text-gradient-brand inline-block">
              {t("landing.hero.titleHighlight", { defaultValue: HERO_CONTENT.titleHighlight })}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("landing.hero.description", { defaultValue: HERO_CONTENT.description })}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="defaultWithTextWhite" size="lg" asChild>
              <Link href={HERO_CONTENT.primaryCta.href}>
                {t("landing.hero.primary", { defaultValue: HERO_CONTENT.primaryCta.label })}
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href={HERO_CONTENT.secondaryCta.href}>
                {t("landing.hero.secondary", { defaultValue: HERO_CONTENT.secondaryCta.label })}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1">{t("landing.hero.worksWith", { defaultValue: HERO_CONTENT.worksWithLabel })}</span>
            {HERO_CONTENT.worksWith.map((platform) => (
              <span
                key={platform.name}
                className="bg-card text-foreground/80 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              >
                <platform.icon className="size-3.5" aria-hidden="true" />
                {platform.name}
              </span>
            ))}
          </div>
        </div>
        <HeroPreview />
      </Container>
    </section>
  );
};
