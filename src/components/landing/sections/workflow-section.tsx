"use client";

import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { WorkflowSteps } from "@/components/landing/sections/workflow-steps";
import { WORKFLOW_CONTENT } from "@/data/landing-content";

export const WorkflowSection = () => {
  const { t } = useTranslation("common");
  return (
    <section id="workflow" className="scroll-mt-16 py-10 md:py-24">
      <Container>
        <div className="mx-auto mb-6 max-w-2xl text-center md:mb-12">
          <span className="text-primary mb-4 block text-xs font-semibold tracking-widest uppercase">
            {t("landing.workflow.eyebrow", { defaultValue: WORKFLOW_CONTENT.eyebrow })}
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {t("landing.workflow.title", { defaultValue: WORKFLOW_CONTENT.title })}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t("landing.workflow.description", { defaultValue: WORKFLOW_CONTENT.description })}
          </p>
        </div>
        <WorkflowSteps />
      </Container>
    </section>
  );
};
