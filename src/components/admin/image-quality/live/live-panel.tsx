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
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">The live stats could not be read</p>
          <p className="mt-1 text-[13px] text-slate-500">The backend did not answer.</p>
        </div>
      );
    }
    if (isLoading || !stats) {
      return <SectionLoading label="Loading live generation stats" />;
    }
    if (stats.versions.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
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
    <div className="flex flex-col gap-5">
      <section className="relative flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Generation by prompt version
          </h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
            Every design image the jobs saved, grouped by image provider and the prompt version that
            made it.
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => isImageQualityLiveRange(value) && setRange(value)}
        >
          <SelectTrigger className="h-10 w-44 text-sm" aria-label="Period">
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
