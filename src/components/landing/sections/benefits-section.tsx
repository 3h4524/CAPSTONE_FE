import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import { BENEFITS, BENEFITS_CONTENT } from "@/data/landing-content";

/** Three separate white cards on the page background, styled like the workflow steps further down. */
export const BenefitsSection = () => {
  return (
    <section className="py-12 md:py-20">
      <Container>
        <SectionHeading
          title={BENEFITS_CONTENT.title}
          description={BENEFITS_CONTENT.description}
          className="mb-8 md:mb-12"
        />
        <ul className="grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.title}
              className="bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-8"
            >
              <span className="bg-brand-soft text-brand-ink flex size-12 items-center justify-center rounded-full border">
                <benefit.icon className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-brand-ink text-lg font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
