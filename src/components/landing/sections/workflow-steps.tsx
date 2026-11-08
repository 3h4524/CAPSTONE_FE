"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { WORKFLOW_STEPS } from "@/data/landing-content";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

/**
 * The steps as a row of cards, or one open at a time on a phone. Every step stays in the page, so
 * search engines read them all whichever one is open.
 */
export const WorkflowSteps = () => {
  const isPhone = useIsPhone();
  const [openStep, setOpenStep] = useState<string | null>(WORKFLOW_STEPS[0]?.index ?? null);

  return (
    <ol className="relative grid list-none gap-6 p-0 max-md:gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      <div className="bg-border absolute top-12 right-[12%] left-[12%] hidden h-px xl:block" aria-hidden="true" />
      {WORKFLOW_STEPS.map((step) => {
        const isOpen = openStep === step.index;
        return (
          <li key={step.index} className="contents">
            <Card className="relative gap-4 overflow-hidden p-6 max-md:gap-0 max-md:p-0">
              <h3 className="font-display text-lg font-semibold max-md:text-base">
                <button
                  type="button"
                  aria-expanded={isPhone ? isOpen : undefined}
                  tabIndex={isPhone ? 0 : -1}
                  className="flex w-full flex-col items-start gap-4 text-left max-md:min-h-14 max-md:flex-row max-md:items-center max-md:gap-3 max-md:px-3.5 max-md:py-2 md:cursor-default"
                  onClick={() => isPhone && setOpenStep(isOpen ? null : step.index)}
                >
                  <span className="bg-primary text-primary-foreground font-display flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold max-md:size-9">
                    {step.index}
                  </span>
                  <span className="max-md:flex-1">{step.title}</span>
                  <ChevronDown
                    className={cn("text-muted-foreground size-4 shrink-0 transition-transform md:hidden", isOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              </h3>
              <div className={cn("flex flex-col gap-4 max-md:gap-3 max-md:px-3.5 max-md:pb-3.5", !isOpen && "max-md:hidden")}>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                <div className="relative aspect-video overflow-hidden rounded-md border">
                  <Image
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 767px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ol>
  );
};
