"use client";

import React, { useMemo } from "react";
import {
  Clapperboard,
  GitFork,
  Image as ImageIcon,
  Layers,
  Tag,
  Wrench,
} from "lucide-react";

import type {
  IntegrationStatusDto,
  PipelineStageBreakdownDto,
} from "@/types/system-statistics";

interface PipelineStageBreakdownProps {
  pipelineStages?: PipelineStageBreakdownDto[];
  integrationStatus?: IntegrationStatusDto;
  isLoading: boolean;
}

interface StepConfig {
  badge: string;
  icon: React.ReactNode;
  relativeTo?: string;
  relativeNoun?: string;
}

const PUBLISHED_STAGE = "Published to Etsy";

const STEP_DETAILS: Record<string, StepConfig> = {
  "Image Generation": {
    badge: "Source Designs",
    icon: <ImageIcon className="h-4 w-4 text-slate-600" />,
  },
  "Mock-up Rendering": {
    badge: "Product Mockups",
    icon: <Wrench className="h-4 w-4 text-slate-600" />,
    relativeTo: "Image Generation",
    relativeNoun: "image",
  },
  "Video Rendering": {
    badge: "Promo Videos",
    icon: <Clapperboard className="h-4 w-4 text-slate-600" />,
    relativeTo: "Image Generation",
    relativeNoun: "image",
  },
  "Listing Generation": {
    badge: "Listing Copies",
    icon: <Tag className="h-4 w-4 text-slate-600" />,
    relativeTo: "Image Generation",
    relativeNoun: "image",
  },
  [PUBLISHED_STAGE]: {
    badge: "Marketplace Uploads",
    icon: (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f97316] text-[9px] font-bold text-white shadow-2xs">
        Etsy
      </div>
    ),
    relativeTo: "Listing Generation",
    relativeNoun: "listing",
  },
};

const FALLBACK_STEP: StepConfig = {
  badge: "Pipeline Stage",
  icon: <Layers className="h-4 w-4 text-slate-600" />,
};

export function PipelineStageBreakdown({
  pipelineStages = [],
  integrationStatus,
  isLoading,
}: PipelineStageBreakdownProps) {
  const totalAssets = useMemo(() => {
    return pipelineStages.reduce((sum, s) => sum + s.count, 0);
  }, [pipelineStages]);

  const rows = useMemo(() => {
    const stages = pipelineStages.map((s) => ({ stageName: s.stageName, count: s.count }));
    if (integrationStatus) {
      stages.push({ stageName: PUBLISHED_STAGE, count: integrationStatus.etsyTotal });
    }
    const countByStage = new Map(stages.map((s) => [s.stageName, s.count]));
    const maxCount = Math.max(1, ...stages.map((s) => s.count));

    return stages.map((stage) => {
      const details = STEP_DETAILS[stage.stageName];
      const reference = details?.relativeTo ? countByStage.get(details.relativeTo) ?? 0 : 0;
      let ratioText = "Funnel entry";
      let isZeroBottleneck = false;

      if (details?.relativeTo && reference > 0) {
        const ratio = stage.count / reference;
        if (ratio >= 1) {
          ratioText = `${ratio.toFixed(2)}x per ${details.relativeNoun}`;
        } else {
          ratioText = `${(ratio * 100).toFixed(1)}% of ${details.relativeNoun}s`;
          if (stage.count === 0) isZeroBottleneck = true;
        }
      } else if (details?.relativeTo) {
        ratioText = stage.count === 0 ? `0.0% of ${details.relativeNoun}s` : "—";
        if (stage.count === 0) isZeroBottleneck = true;
      }

      return {
        ...stage,
        details,
        ratioText,
        isZeroBottleneck,
        width: stage.count === 0 ? 0 : Math.max((stage.count / maxCount) * 100, 2),
      };
    });
  }, [pipelineStages, integrationStatus]);

  const isEmpty = pipelineStages.length === 0 || totalAssets === 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <GitFork className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Pipeline conversion</h3>
          {isLoading ? (
            <div className="mt-1 h-3.5 w-48 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{totalAssets.toLocaleString()}</span>{" "}
              assets generated · each stage vs the one it builds on
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 space-y-4 pt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 rounded bg-slate-100" />
                  <div className="h-1.5 w-full rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 items-center justify-center py-16 text-xs text-slate-400">
            No generative assets recorded in this period.
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-around py-1">
            {rows.map((row) => {
              const details = row.details ?? FALLBACK_STEP;
              return (
                <div key={row.stageName} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        {details.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">
                          {row.stageName}
                        </p>
                        <p className="text-[11px] text-slate-400">{details.badge}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-slate-900">
                        {row.count.toLocaleString()}
                      </p>
                      <p
                        className={`text-[11px] ${
                          row.isZeroBottleneck
                            ? "font-semibold text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {row.ratioText}
                      </p>
                    </div>
                  </div>
                  {/* Subtle Slate Blue Progress Track */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#475569] transition-all duration-500 ease-out"
                      style={{ width: `${row.width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
