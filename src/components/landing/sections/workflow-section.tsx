import { Container } from "@/components/commons/layout/container";
import { WorkflowSteps } from "@/components/landing/sections/workflow-steps";
import { WORKFLOW_CONTENT } from "@/data/landing-content";

export const WorkflowSection = () => {
  return (
    <section id="workflow" className="scroll-mt-16 py-10 md:py-24">
      <Container>
        <div className="mx-auto mb-6 max-w-2xl text-center md:mb-12">
          <span className="text-primary mb-4 block text-xs font-semibold tracking-widest uppercase">
            {WORKFLOW_CONTENT.eyebrow}
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {WORKFLOW_CONTENT.title}
          </h2>
          <p className="text-muted-foreground mt-4">
            {WORKFLOW_CONTENT.description}
          </p>
        </div>
        <WorkflowSteps />
      </Container>
    </section>
  );
};
