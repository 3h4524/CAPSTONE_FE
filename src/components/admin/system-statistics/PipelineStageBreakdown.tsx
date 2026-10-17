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
  barColor: string;
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
    barColor: "bg-[#0f172a] dark:bg-slate-100",
    percentageBadge: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
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
    barColor: "bg-[#334155] dark:bg-slate-300",
    percentageBadge: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
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
    barColor: "bg-[#c2410c] dark:bg-orange-500",
    percentageBadge: "border-orange-300/80 bg-orange-50 text-[#c2410c] dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
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
    barColor: "bg-[#15803d] dark:bg-emerald-500",
    percentageBadge: "border-emerald-300/80 bg-emerald-50 text-[#15803d] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
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
    <Card className="flex flex-col gap-0 rounded-lg border border-slate-200/90 bg-white py-0 shadow-none dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200/90 px-4.5 py-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Pipeline Stage Breakdown
            </CardTitle>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              End-to-end generative asset throughput
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-sm border border-slate-300 bg-slate-100 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
              {totalAssets.toLocaleString()} TOTAL
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4.5 py-4">
        {isEmpty ? (
          <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">
            No generative assets recorded in this period.
          </div>
        ) : (
          <div className="relative space-y-1.5">
            {pipelineStages.map((stage, index) => {
              const details = STEP_DETAILS[stage.stageName] ?? {
                step: `0${index + 1}`,
                badge: "Pipeline Stage",
                icon: <Layers className="h-5 w-5 text-slate-500" />,
                barColor: "bg-slate-800",
                percentageBadge: "border-slate-300 bg-slate-100 text-slate-700",
              };

              const isLast = index === pipelineStages.length - 1;

              return (
                <div key={stage.stageName} className="group relative">
                  {/* Step Card */}
                  <div className="relative rounded-md border border-slate-200/90 bg-white p-3 shadow-none transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700">
                    <div className="flex items-center justify-between">
                      {/* Left: Step number, icon in white frame, and name */}
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                          {index + 1}.
                        </span>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                          {details.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {stage.stageName}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {details.badge}
                          </span>
                        </div>
                      </div>

                      {/* Right: Count and Percentage Badge */}
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {stage.count.toLocaleString()}
                        </div>
                        <span
                          className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold ${details.percentageBadge}`}
                        >
                          {stage.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Proportional Solid Bar Track */}
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-xs bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${details.barColor}`}
                        style={{
                          width: `${Math.max(stage.percentage, 2)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Flow Arrow Connector between steps */}
                  {!isLast && (
                    <div className="my-1 flex justify-center">
                      <div className="flex h-4 w-4 items-center justify-center text-slate-300 dark:text-slate-600">
                        <ArrowDown className="h-3 w-3 stroke-[2]" />
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
