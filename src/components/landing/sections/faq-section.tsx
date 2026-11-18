"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_CONTENT, FAQS } from "@/data/landing-content";
import { cn } from "@/utils/cn";

// A phone starts on the first few; the rest stay in the page for search engines.
const PHONE_FAQS = 3;

export const FaqSection = () => {
  const { t } = useTranslation("common");
  const [showsAll, setShowsAll] = useState(false);

  if (FAQS.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-16 py-12 md:py-24">
      <Container className="grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <SectionHeading
          title={t("landing.faq.title", { defaultValue: FAQ_CONTENT.title })}
          description={t("landing.faq.description", { defaultValue: FAQ_CONTENT.description })}
          align="left"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <p className="text-muted-foreground text-sm">
            {t("landing.faq.supportHint", { defaultValue: FAQ_CONTENT.supportHint })}{" "}
            <Link
              href={FAQ_CONTENT.supportCta.href}
              className="text-brand-ink inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
            >
              {t("landing.faq.supportCta", { defaultValue: FAQ_CONTENT.supportCta.label })}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </p>
        </SectionHeading>
        <div>
          <Accordion type="single" collapsible>
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`item-${index}`}
                className={cn("bg-card mb-3 rounded-lg border px-5 max-md:mb-2 max-md:px-4", !showsAll && index >= PHONE_FAQS && "max-md:hidden")}
              >
                <AccordionTrigger className="text-brand-ink text-left font-medium hover:no-underline">
                  {t(`landing.faq.items.${index}.question`, { defaultValue: faq.question })}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`landing.faq.items.${index}.answer`, { defaultValue: faq.answer })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {FAQS.length > PHONE_FAQS && (
            <button
              type="button"
              className="mx-auto flex min-h-11 items-center text-sm font-semibold md:hidden"
              onClick={() => setShowsAll((value) => !value)}
            >
              {showsAll ? t("landing.faq.showFewer") : t("landing.faq.showAll", { count: FAQS.length })}
            </button>
          )}
        </div>
      </Container>
    </section>
  );
};
