"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LiveHighlightCards } from "@/components/admin/image-quality/live/live-highlight-cards";
import { LiveNotes } from "@/components/admin/image-quality/live/live-notes";
import { LiveVersionTable } from "@/components/admin/image-quality/live/live-version-table";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getImageQualityLiveFilter,
  getImageQualityLiveHighlights,
  isImageQualityLiveRange,
} from "@/helpers/image-quality-live";
import { useAdminImageQualityLive } from "@/hooks/queries/use-admin-image-quality-live";
import type { ImageQualityLiveRange } from "@/types/admin-image-quality";

const RANGE_KEYS: Record<ImageQualityLiveRange, string> = {
  all: "admin.imageQuality.live.ranges.all",
  "90d": "admin.imageQuality.live.ranges.last90Days",
  "30d": "admin.imageQuality.live.ranges.last30Days",
};

const RANGE_VALUES = Object.keys(RANGE_KEYS) as ImageQualityLiveRange[];

export const LivePanel = () => {
  const { t } = useTranslation("common");
  const [range, setRange] = useState<ImageQualityLiveRange>("all");
  const filter = useMemo(() => getImageQualityLiveFilter(range, new Date()), [range]);
  const { data: stats, isLoading, isError } = useAdminImageQualityLive(filter);
  const highlights = useMemo(
    () => (stats ? getImageQualityLiveHighlights(stats.versions) : null),
    [stats]
  );

  const renderContent = () => {
    if (isError) {
      return (
        <div className="border-ink-200 bg-card rounded-xl border px-5 py-14 text-center">
          <p className="text-ink-700 text-sm font-semibold">{t("admin.imageQuality.live.errorTitle")}</p>
          <p className="text-ink-500 mt-1 text-[13px]">{t("admin.imageQuality.live.errorBody")}</p>
        </div>
      );
    }
    if (isLoading || !stats) {
      return <SectionLoading label={t("admin.imageQuality.live.loading")} />;
    }
    if (stats.versions.length === 0) {
      return (
        <div className="border-ink-300 bg-card text-ink-500 rounded-xl border border-dashed px-5 py-14 text-center text-sm">
          {t("admin.imageQuality.live.empty")}
        </div>
      );
    }
    return (
      <>
        {highlights ? <LiveHighlightCards highlights={highlights} /> : null}
        <LiveVersionTable versions={stats.versions} />
        <LiveNotes />
      </>
    );
  };

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      <section className="border-ink-200 bg-card relative flex flex-col justify-between gap-3 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:p-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h3 className="text-ink-900 text-base font-semibold">
            {t("admin.imageQuality.live.title")}
          </h3>
          <p className="text-ink-500 mt-1 max-w-2xl text-[13px] leading-relaxed">
            {t("admin.imageQuality.live.description")}
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => isImageQualityLiveRange(value) && setRange(value)}
        >
          <SelectTrigger className="h-10 w-44 text-sm max-md:w-full" aria-label={t("admin.imageQuality.live.periodAriaLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_VALUES.map((value) => (
              <SelectItem key={value} value={value} className="text-sm">
                {t(RANGE_KEYS[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      {renderContent()}
    </div>
  );
};
