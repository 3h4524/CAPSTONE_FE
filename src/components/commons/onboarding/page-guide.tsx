"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ACTIONS, type EventData, EVENTS, Joyride, ORIGIN, STATUS, type Step } from "react-joyride";

import { PAGE_GUIDE_VERSIONS, PAGE_GUIDES } from "@/constants/onboarding";
import { useUpdateOnboardingProgress } from "@/hooks/mutations/use-update-onboarding-progress";
import { useOnboardingProgress } from "@/hooks/queries/use-onboarding-progress";
import { usePageGuide } from "@/hooks/use-page-guide";
import { useOnboardingGuideStore } from "@/stores/onboarding-guide";
import type { GuideProgressStatus, OnboardingGuideKey } from "@/types/onboarding";

type PageGuideProps = {
  guideKey: OnboardingGuideKey;
  requiresDesktop?: boolean;
};

export const PageGuide = ({ guideKey, requiresDesktop }: PageGuideProps) => {
  const { t } = useTranslation("common");
  const { data } = useOnboardingProgress();
  const updateProgress = useUpdateOnboardingProgress();
  const activeGuide = useOnboardingGuideStore((state) => state.activeGuide);
  const resumeStep = useOnboardingGuideStore((state) => state.resumeStep);
  const stop = useOnboardingGuideStore((state) => state.stop);
  const dismissThisSession = useOnboardingGuideStore((state) => state.dismissThisSession);

  usePageGuide(guideKey, requiresDesktop);

  const steps = useMemo<Step[]>(
    () =>
      PAGE_GUIDES[guideKey].map((step) => ({
        target: step.target,
        placement: step.placement,
        floatingOptions: step.placement === "center" ? { hideArrow: true } : undefined,
        skipBeacon: true,
        content: (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">{t(step.titleKey)}</p>
            <p className="text-muted-foreground text-sm">{t(step.bodyKey)}</p>
          </div>
        ),
      })),
    [guideKey, t]
  );

  const save = (status: GuideProgressStatus, step: number) => {
    if (!data) return;
    updateProgress.mutate({
      guideProgress: {
        ...data.guideProgress,
        [guideKey]: { version: PAGE_GUIDE_VERSIONS[guideKey], status, step },
      },
      checklistDismissed: data.checklistDismissed,
    });
  };

  const handleEvent = (event: EventData) => {
    if (event.type === EVENTS.STEP_AFTER) {
      if (event.action === ACTIONS.NEXT) save("active", event.index + 1);
      if (event.action === ACTIONS.PREV) save("active", Math.max(0, event.index - 1));
      return;
    }

    if (event.type !== EVENTS.TOUR_END) return;

    stop();
    dismissThisSession(guideKey);

    if (event.status === STATUS.FINISHED) {
      save("completed", steps.length - 1);
      return;
    }

    if (event.origin === ORIGIN.BUTTON_SKIP) {
      save("skipped", event.index);
      return;
    }

    save("active", event.index);
  };

  const isRunning = activeGuide === guideKey;

  return (
    <Joyride
      key={`${guideKey}-${resumeStep}`}
      run={isRunning}
      continuous
      steps={steps}
      initialStepIndex={resumeStep}
      onEvent={handleEvent}
      scrollToFirstStep
      options={{
        buttons: ["back", "close", "skip", "primary"],
        closeButtonAction: "skip",
        overlayClickAction: false,
        dismissKeyAction: false,
        spotlightRadius: 8,
        zIndex: 60,
        primaryColor: "#18181b",
      }}
      locale={{
        back: t("pageGuides.locale.back"),
        close: t("pageGuides.locale.close"),
        next: t("pageGuides.locale.next"),
        last: t("pageGuides.locale.last"),
        skip: t("pageGuides.locale.skip"),
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
          maxHeight: "calc(100vh - 24px)",
          overflowY: "auto",
        },
      }}
    />
  );
};