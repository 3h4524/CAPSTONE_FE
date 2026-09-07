import Image from "next/image";

import { Container } from "@/components/commons/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WORKFLOW_CONTENT, WORKFLOW_STEPS } from "@/data/landing-content";

export const WorkflowSection = () => {
  return (
    <section id="workflow" className="scroll-mt-16 py-16 md:py-24">
      <Container>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 tracking-widest uppercase">
            {WORKFLOW_CONTENT.eyebrow}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {WORKFLOW_CONTENT.title}
          </h2>
          <p className="text-muted-foreground mt-4">
            {WORKFLOW_CONTENT.description}
          </p>
        </div>
        <ol className="relative grid list-none gap-6 p-0 md:grid-cols-3">
          <div
            className="bg-border absolute top-12 right-[18%] left-[18%] hidden h-px md:block"
            aria-hidden="true"
          />
          {WORKFLOW_STEPS.map((step) => (
            <li key={step.index} className="contents">
              <Card className="relative gap-4 overflow-hidden p-6">
                <span className="bg-primary text-primary-foreground font-display flex size-12 items-center justify-center rounded-full text-sm font-bold">
                  {step.index}
                </span>
                <h3 className="font-display text-lg font-semibold">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
                <div className="relative aspect-video overflow-hidden rounded-md border">
                  <Image
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
};
