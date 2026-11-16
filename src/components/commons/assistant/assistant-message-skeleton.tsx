"use client";

import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

export const AssistantMessageSkeleton = () => {
  const { t } = useTranslation("common");
  return (
  <div className="flex flex-col gap-3" aria-label={t("commons.assistant.loadingConversation")}>
    <Skeleton className="h-10 w-2/3 self-end" />
    <Skeleton className="h-16 w-4/5 self-start" />
    <Skeleton className="h-10 w-1/2 self-end" />
  </div>
  );
};
