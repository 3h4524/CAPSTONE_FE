"use client";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { AdminStyleArtPresetViStatus } from "@/types/admin-style-art-presets";

const STATUS_META: Record<AdminStyleArtPresetViStatus, { key: string; className: string }> = {
  ok: { key: "ready", className: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300" },
  pending: { key: "pending", className: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300" },
  failed: { key: "failed", className: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300" },
};

export const ViStatusBadge = ({ status }: { status: AdminStyleArtPresetViStatus | null }) => {
  const { t } = useTranslation("common");

  if (status === null) {
    return (
      <Badge variant="outline" className="border-ink-300 text-ink-500">
        {t("admin.styles.viStatus.none")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={STATUS_META[status].className}>
      {t(`admin.styles.viStatus.${STATUS_META[status].key}`)}
    </Badge>
  );
};
