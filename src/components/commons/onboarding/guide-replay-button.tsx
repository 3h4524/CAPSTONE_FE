"use client";

import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useOnboardingGuideStore } from "@/stores/onboarding-guide";
import type { OnboardingGuideKey } from "@/types/onboarding";
import { cn } from "@/utils/cn";

type GuideReplayButtonProps = {
  guideKey: OnboardingGuideKey;
  iconOnly?: boolean;
  className?: string;
};

export const GuideReplayButton = ({ guideKey, iconOnly, className }: GuideReplayButtonProps) => {
  const { t } = useTranslation("common");
  const start = useOnboardingGuideStore((state) => state.start);
  const label = t("pageGuides.replay");

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      className={cn("text-muted-foreground", className)}
      aria-label={label}
      title={label}
      onClick={() => start(guideKey, 0)}
    >
      <CircleHelp className={cn("size-4", !iconOnly && "mr-2")} aria-hidden="true" />
      {!iconOnly && label}
    </Button>
  );
};
