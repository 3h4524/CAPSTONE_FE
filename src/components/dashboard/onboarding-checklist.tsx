"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ONBOARDING_CHECKLIST_STEPS } from "@/constants/onboarding";
import { useUpdateOnboardingProgress } from "@/hooks/mutations/use-update-onboarding-progress";
import { useOnboardingProgress } from "@/hooks/queries/use-onboarding-progress";
import { cn } from "@/utils/cn";

/** The first steps for a Seller who has made nothing yet; each one ticks off from real data. */
export const OnboardingChecklist = () => {
  const { t } = useTranslation("common");
  const { data, isPending } = useOnboardingProgress();
  const updateProgress = useUpdateOnboardingProgress();

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.checklistDismissed) return null;

  const steps = ONBOARDING_CHECKLIST_STEPS.map((step) => ({
    ...step,
    done: data.signals[step.signal],
  }));
  const doneCount = steps.filter((step) => step.done).length;

  if (doneCount === steps.length) return null;

  const firstOpenStep = steps.find((step) => !step.done)?.guide;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t("dashboard.onboarding.title")}</CardTitle>
            <CardDescription>{t("dashboard.onboarding.description")}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {t("dashboard.onboarding.progress", { done: doneCount, count: steps.length })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7"
              aria-label={t("dashboard.onboarding.dismiss")}
              onClick={() =>
                updateProgress.mutate({
                  guideProgress: data.guideProgress,
                  checklistDismissed: true,
                })
              }
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {steps.map((step, index) => (
            <li
              key={step.guide}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {step.done ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                  {t(`dashboard.onboarding.steps.${step.copyKey}.title`)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t(`dashboard.onboarding.steps.${step.copyKey}.description`)}
                </p>
              </div>
              <Button
                variant={step.guide === firstOpenStep ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={step.href}>
                  {step.done ? t("dashboard.onboarding.open") : t("dashboard.onboarding.start")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
