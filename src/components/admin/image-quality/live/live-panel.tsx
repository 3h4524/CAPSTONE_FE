"use client";

import { useMemo, useState } from "react";

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
import { IMAGE_QUALITY_LIVE_RANGES } from "@/constants/image-quality";
import {
  getImageQualityLiveFilter,
  getImageQualityLiveHighlights,
  isImageQualityLiveRange,
} from "@/helpers/image-quality-live";
import { useAdminImageQualityLive } from "@/hooks/queries/use-admin-image-quality-live";
import type { ImageQualityLiveRange } from "@/types/admin-image-quality";

export const LivePanel = () => {
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
          <p className="text-ink-700 text-sm font-semibold">The live stats could not be read</p>
          <p className="text-ink-500 mt-1 text-[13px]">The backend did not answer.</p>
        </div>
      );
    }
    if (isLoading || !stats) {
      return <SectionLoading label="Loading live generation stats" />;
    }
    if (stats.versions.length === 0) {
      return (
        <div className="border-ink-300 bg-card text-ink-500 rounded-xl border border-dashed px-5 py-14 text-center text-sm">
          No design image was generated in this period.
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
            Generation by prompt version
          </h3>
          <p className="text-ink-500 mt-1 max-w-2xl text-[13px] leading-relaxed">
            Every design image the jobs saved, grouped by image provider and the prompt version that
            made it.
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => isImageQualityLiveRange(value) && setRange(value)}
        >
          <SelectTrigger className="h-10 w-44 text-sm max-md:w-full" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_QUALITY_LIVE_RANGES.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
      {renderContent()}
    </div>
  );
};
