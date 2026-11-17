import type { Metadata } from "next";

import { Reveal } from "@/components/commons/animations/reveal";
import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import { CtaSection } from "@/components/features/sections/cta-section";
import { DuoSection } from "@/components/features/sections/duo-section";
import { PlatformsSection } from "@/components/features/sections/platforms-section";
import { ShowcaseSection } from "@/components/features/sections/showcase-section";
import { SpotlightSection } from "@/components/features/sections/spotlight-section";
import {
  BATCH_FEATURE,
  DESIGN_FEATURE,
  FEATURES_INTRO,
  LISTING_FEATURE,
  PLATFORMS_FEATURE,
  VIDEO_FEATURE,
} from "@/data/features-content";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Features",
  description:
    "Explore what Podivo automates: AI design generation, mockups, promo videos, SEO-optimized Etsy listings, batch processing and sending listings to Etsy and Printify.",
  pathname: "/features",
});

const FeaturesPage = () => {
  return (
    <main className="flex flex-col">
      <section className="bg-landing-glow border-b py-14 md:py-16">
        <Container>
          <SectionHeading
            level="h1"
            title={FEATURES_INTRO.title}
            description={FEATURES_INTRO.description}
          />
        </Container>
      </section>
      <Reveal>
        <SpotlightSection feature={DESIGN_FEATURE} />
      </Reveal>
      <Reveal>
        <ShowcaseSection feature={VIDEO_FEATURE} />
      </Reveal>
      <Reveal>
        <DuoSection listing={LISTING_FEATURE} batch={BATCH_FEATURE} />
      </Reveal>
      <Reveal>
        <PlatformsSection feature={PLATFORMS_FEATURE} />
      </Reveal>
      <CtaSection />
    </main>
  );
};

export default FeaturesPage;
