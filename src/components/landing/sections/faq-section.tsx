"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
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
    <section id="faq" className="scroll-mt-16 py-10 md:py-24">
      <Container className="max-w-3xl">
        <div className="mx-auto mb-6 max-w-2xl text-center md:mb-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {t("landing.faq.title", { defaultValue: FAQ_CONTENT.title })}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t("landing.faq.description", { defaultValue: FAQ_CONTENT.description })}
          </p>
        </div>
        <Accordion type="single" collapsible>
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index}`}
              className={cn("bg-card mb-3 rounded-lg border px-5 max-md:mb-2 max-md:px-4", !showsAll && index >= PHONE_FAQS && "max-md:hidden")}
            >
              <AccordionTrigger className="text-left font-medium hover:no-underline">
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
      </Container>
    </section>
  );
};
