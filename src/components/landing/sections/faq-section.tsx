"use client";

import { Container } from "@/components/commons/layout/container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_CONTENT, FAQS } from "@/data/landing-content";

export const FaqSection = () => {
  if (FAQS.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-16 py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {FAQ_CONTENT.title}
          </h2>
          <p className="text-muted-foreground mt-4">
            {FAQ_CONTENT.description}
          </p>
        </div>
        <Accordion type="single" collapsible>
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index}`}
              className="bg-card mb-3 rounded-lg border px-5"
            >
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
};
