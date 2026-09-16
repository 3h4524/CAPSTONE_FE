import type { Metadata } from "next";

import { Reveal } from "@/components/commons/animations/reveal";
import { CtaSection } from "@/components/features/sections/cta-section";
import { DuoSection } from "@/components/features/sections/duo-section";
import { PlatformsSection } from "@/components/features/sections/platforms-section";
import { ShowcaseSection } from "@/components/features/sections/showcase-section";
import { SpotlightSection } from "@/components/features/sections/spotlight-section";
import {
  BATCH_FEATURE,
  DESIGN_FEATURE,
  LISTING_FEATURE,
  PLATFORMS_FEATURE,
  VIDEO_FEATURE,
} from "@/data/features-content";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Features",
    description:
      "Explore APCS features in detail: AI design generation, video creation, Etsy listing content, batch processing, and platform integrations.",
    pathname: "/features",
  });

const FeaturesPage = () => {
  return (
    <main className="flex flex-col">
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
