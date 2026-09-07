import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { CTA_CONTENT } from "@/data/landing-content";

export const CtaSection = () => {
  return (
    <section id="signup" className="scroll-mt-16 pb-16 md:pb-24">
      <Container>
        <div className="bg-primary text-primary-foreground rounded-lg px-6 py-14 text-center md:p-16">
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {CTA_CONTENT.title}
          </h2>
          <p className="text-primary-foreground/70 mx-auto mt-4 max-w-xl">
            {CTA_CONTENT.description}
          </p>
          <Button
            variant="defaultWithTextWhite"
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 mt-8"
            asChild
          >
            <a href={CTA_CONTENT.primaryCta.href}>
              {CTA_CONTENT.primaryCta.label}
            </a>
          </Button>
        </div>
      </Container>
    </section>
  );
};
