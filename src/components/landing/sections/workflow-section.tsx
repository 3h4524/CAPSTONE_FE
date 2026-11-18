"use client";

import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import { WorkflowSteps } from "@/components/landing/sections/workflow-steps";
import { WORKFLOW_CONTENT } from "@/data/landing-content";

export const WorkflowSection = () => {
  const { t } = useTranslation("common");
  return (
    <section id="workflow" className="scroll-mt-16 py-12 md:py-24">
      <Container>
        <SectionHeading
          title={t("landing.workflow.title", { defaultValue: WORKFLOW_CONTENT.title })}
          description={t("landing.workflow.description", { defaultValue: WORKFLOW_CONTENT.description })}
          className="mb-10 md:mb-14"
        />
        <WorkflowSteps />
      </Container>
    </section>
  );
};
