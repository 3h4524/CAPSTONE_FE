"use client";

import React, { useMemo } from "react";
import { ArrowDown, Layers } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PipelineStageBreakdownDto } from "@/types/system-statistics";

interface PipelineStageBreakdownProps {
  pipelineStages?: PipelineStageBreakdownDto[];
  isLoading: boolean;
}

interface StepConfig {
  step: string;
  badge: string;
  icon: React.ReactNode;
  barGradient: string;
  percentageBadge: string;
}

const STEP_DETAILS: Record<string, StepConfig> = {
  "Image Generation": {
    step: "01",
    badge: "Source Designs",
    icon: (
      <img
        src="/icons/stat-images.png"
        alt="Image Generation"
        className="h-5 w-5 object-contain"
      />
    ),
    barGradient: "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500",
    percentageBadge: "border-blue-200/80 bg-blue-50/90 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
  },
  "Mock-up Rendering": {
    step: "02",
    badge: "Product Mockups",
    icon: (
      <img
        src="/icons/stat-mockup.png"
        alt="Mock-up Rendering"
        className="h-5 w-5 object-contain dark:brightness-200"
      />
    ),
    barGradient: "bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500",
    percentageBadge: "border-indigo-200/80 bg-indigo-50/90 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  "Video Rendering": {
    step: "03",
    badge: "Promo Videos",
    icon: (
      <img
        src="/icons/stat-videos.png"
        alt="Video Rendering"
        className="h-5 w-5 object-contain"
      />
    ),
    barGradient: "bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-500 dark:to-purple-500",
    percentageBadge: "border-violet-200/80 bg-violet-50/90 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300",
  },
  "Listing Generation": {
    step: "04",
    badge: "Listing Copies",
    icon: (
      <img
        src="/icons/stat-listings.png"
        alt="Listing Generation"
        className="h-5 w-5 object-contain"
      />
    ),
    barGradient: "bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500",
    percentageBadge: "border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

export function PipelineStageBreakdown({
  pipelineStages = [],
  isLoading,
}: PipelineStageBreakdownProps) {
  const totalAssets = useMemo(() => {
    return pipelineStages.reduce((sum, s) => sum + s.count, 0);
  }, [pipelineStages]);

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-0 py-0 border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100/80 px-5 py-3.5 dark:border-slate-800/80">
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-1 h-3.5 w-60 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
        </CardHeader>
        <CardContent className="space-y-3 px-5 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  const isEmpty = pipelineStages.length === 0 || totalAssets === 0;

  return (
    <Card className="flex flex-col gap-0 py-0 border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100/80 px-5 py-3.5 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Pipeline Stage Breakdown
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              End-to-end asset generation pipeline throughput
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 px-2.5 py-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              {totalAssets.toLocaleString()} total
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-4">
        {isEmpty ? (
          <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
            No generative assets recorded in this period.
          </div>
        ) : (
          <div className="relative space-y-1">
            {pipelineStages.map((stage, index) => {
              const details = STEP_DETAILS[stage.stageName] ?? {
                step: `0${index + 1}`,
                badge: "Pipeline Stage",
                icon: <Layers className="h-5 w-5 text-slate-500" />,
                barGradient: "bg-gradient-to-r from-slate-600 to-slate-700",
                percentageBadge: "border-slate-200/80 bg-slate-50/90 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300",
              };

              const isLast = index === pipelineStages.length - 1;

              return (
                <div key={stage.stageName} className="group relative">
                  {/* Step Card */}
                  <div className="relative rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      {/* Left: Step number, icon in white frame, and name */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 font-mono text-[11px] font-bold text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {details.step}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1.5 shadow-2xs transition-transform duration-200 group-hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
                          {details.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {stage.stageName}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {details.badge}
                          </span>
                        </div>
                      </div>

                      {/* Right: Count and Percentage Badge */}
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {stage.count.toLocaleString()}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold shadow-2xs ${details.percentageBadge}`}
                        >
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Proportional Progress Track */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out shadow-xs ${details.barGradient}`}
                        style={{
                          width: `${stage.percentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Flow Arrow Connector between steps */}
                  {!isLast && (
                    <div className="my-1.5 flex justify-center">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-400 shadow-2xs transition-colors group-hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-500">
                        <ArrowDown className="h-3 w-3 stroke-[2.5]" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
