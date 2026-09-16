import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { HERO_CONTENT, HERO_IMAGE } from "@/data/landing-content";

export const HeroSection = () => {
  return (
    <section className="bg-hero-gradient overflow-hidden">
      <Container className="grid items-center gap-12 pt-16 pb-16 md:pt-24 md:pb-24 lg:grid-cols-2">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <h1 className="font-display text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl lg:leading-[1.05]">
            {HERO_CONTENT.title}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {HERO_CONTENT.description}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="defaultWithTextWhite" size="lg" asChild>
              <Link href={HERO_CONTENT.primaryCta.href}>{HERO_CONTENT.primaryCta.label}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href={HERO_CONTENT.secondaryCta.href}>
                {HERO_CONTENT.secondaryCta.label}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-lg border shadow-lg">
          <Image
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </Container>
    </section>
  );
};
