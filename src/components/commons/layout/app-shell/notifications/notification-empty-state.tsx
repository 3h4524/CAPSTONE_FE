"use client";

import { BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NotificationEmptyState = () => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <BellOff className="text-muted-foreground size-8" />
      <p className="text-sm font-medium">{t("commons.notifications.emptyTitle")}</p>
      <p className="text-muted-foreground text-xs">
        {t("commons.notifications.emptyDescription")}
      </p>
    </div>
  );
};
