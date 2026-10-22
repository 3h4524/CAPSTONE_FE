"use client";

import React, { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";

import { TestReportStatusBadge } from "@/components/admin/test-reports/test-report-status-badge";
import type { TestReportSpec } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportSpecRowProps = {
  spec: TestReportSpec;
};

const formatDuration = (durationMs: number) =>
  durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;

export const TestReportSpecRow = ({ spec }: TestReportSpecRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasError = Boolean(spec.errorMessage || spec.errorStack || spec.errorSnippet);

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <TestReportStatusBadge status={spec.status} className="shrink-0" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            spec.status === "failed" ? "font-medium text-rose-700" : "text-slate-700"
          )}
        >
          {spec.title}
        </span>
        {spec.retries > 0 && (
          <span
            className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-600"
            title="The test passed only after a retry"
          >
            <RotateCcw className="size-3" />
            {spec.retries}
          </span>
        )}
        <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-400">
          {formatDuration(spec.durationMs)}
        </span>
        {hasError && (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={isOpen ? "Hide the failure" : "Show the failure"}
            aria-expanded={isOpen}
          >
            <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        )}
      </div>

      {isOpen && hasError && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {spec.errorMessage && (
            <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-rose-700">
              {spec.errorMessage}
            </p>
          )}
          {spec.errorSnippet && (
            <pre className="overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700">
              {spec.errorSnippet}
            </pre>
          )}
          {spec.errorStack && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-semibold tracking-wide text-slate-500 uppercase select-none">
                Stack trace
              </summary>
              <pre className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                {spec.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
};
