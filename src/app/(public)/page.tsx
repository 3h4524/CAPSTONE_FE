import type { Metadata } from "next";

import { BenefitsSection } from "@/components/landing/sections/benefits-section";
import { ComparisonSection } from "@/components/landing/sections/comparison-section";
import { CtaSection } from "@/components/landing/sections/cta-section";
import { EcosystemSection } from "@/components/landing/sections/ecosystem-section";
import { FaqSection } from "@/components/landing/sections/faq-section";
import { HeroSection } from "@/components/landing/sections/hero-section";
import { WorkflowSection } from "@/components/landing/sections/workflow-section";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Scale Your POD Empire at AI Speed",
    description: SITE_CONFIG.description,
    pathname: "/",
  });

const RootPage = () => {
  return (
    <>
      <main className="flex flex-col">
        <HeroSection />
        <BenefitsSection />
        <EcosystemSection />
        <WorkflowSection />
        <ComparisonSection />
        <FaqSection />
        <CtaSection />
      </main>
      <FaqJsonLd />
    </>
  );
};

export default RootPage;
