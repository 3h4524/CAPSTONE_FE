"use client";

import { useTranslation } from "react-i18next";

import { Container } from "@/components/commons/layout/container";
import { SectionHeading } from "@/components/commons/layout/section-heading";
import { FEATURES_INTRO } from "@/data/features-content";

/** The page's opening heading, in the same tinted band as the landing hero. */
export const IntroSection = () => {
  const { t } = useTranslation("common");
  return (
    <section className="bg-landing-glow border-b py-14 md:py-16">
      <Container>
        <SectionHeading
          level="h1"
          title={t("featuresPage.intro.title", { defaultValue: FEATURES_INTRO.title })}
          description={t("featuresPage.intro.description", { defaultValue: FEATURES_INTRO.description })}
        />
      </Container>
    </section>
  );
};
