"use client";

import { Activity, AlertTriangle, ClipboardCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { describeGreeting, splitActionItems } from "@/helpers/seller-dashboard";
import { useAuthStore } from "@/stores/auth";
import type { ActionItem } from "@/types/seller-dashboard";

type GreetingProps = {
  items: ActionItem[];
  activeBatchCount: number;
};


const getFirstName = (fullName?: string | null): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
};

/** Who is signed in and, at a glance, what needs them: urgent fixes, reviews and running jobs. */
export const Greeting = ({ items, activeBatchCount }: GreetingProps) => {
  const { t, i18n } = useTranslation("common");
  const today = () => new Date().toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" });
  const fullName = useAuthStore((state) => state.user?.fullName);
  const firstName = getFirstName(fullName);
  const { fixNow, toReview } = splitActionItems(items);

  return (
    <div className="min-w-0 space-y-2">
      <div>
        <p className="text-muted-foreground text-xs">{today()}</p>
        <h1 className="truncate text-2xl font-semibold tracking-tight" title={fullName ?? undefined}>
          {firstName ? t("dashboard.hero.welcomeNamed", { name: firstName }) : t("dashboard.hero.welcome")}
        </h1>
        <p className="text-muted-foreground text-sm">{describeGreeting(items)}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        {fixNow.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {t("dashboard.inbox.toFix", { count: fixNow.length })}
          </span>
        )}
        {toReview.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
            {t("dashboard.inbox.toReview", { count: toReview.length })}
          </span>
        )}
        {activeBatchCount > 0 && (
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
            <Activity className="size-3.5" aria-hidden="true" />
            {t("dashboard.greeting.batchJobs", { count: activeBatchCount })}
          </span>
        )}
      </div>
    </div>
  );
};
