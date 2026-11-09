"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";

import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
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
    <li className="border-ink-100 border-b last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <TestReportStatusBadge status={spec.status} className="shrink-0" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-xs",
            spec.status === "failed" ? "font-medium text-rose-700 dark:text-rose-300" : "text-ink-700"
          )}
        >
          {spec.title}
        </span>
        {spec.isKnownIssue && (
          <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            known gap
          </span>
        )}
        {spec.retries > 0 && (
          <span
            className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            title="The test passed only after a retry"
          >
            <RotateCcw className="size-3" />
            {spec.retries}
          </span>
        )}
        <span className="text-ink-400 w-16 shrink-0 text-right font-mono text-[11px]">
          {formatDuration(spec.durationMs)}
        </span>
        {hasError && (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 flex size-6 shrink-0 items-center justify-center rounded transition-colors"
            aria-label={isOpen ? "Hide the failure" : "Show the failure"}
            aria-expanded={isOpen}
          >
            <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        )}
      </div>

      {isOpen && hasError && (
        <div className="border-ink-100 bg-ink-50/60 space-y-3 border-t px-4 py-3">
          {spec.errorMessage && (
            <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-rose-700 dark:text-rose-300">
              {spec.errorMessage}
            </p>
          )}
          {spec.errorSnippet && (
            <pre className="border-ink-200 bg-card text-ink-700 overflow-x-auto rounded border p-3 font-mono text-[11px] leading-relaxed">
              {spec.errorSnippet}
            </pre>
          )}
          {spec.errorStack && (
            <details className="group">
              <summary className="text-ink-500 cursor-pointer text-[10px] font-semibold tracking-wide uppercase select-none">
                Stack trace
              </summary>
              <pre className="border-ink-200 bg-card text-ink-600 mt-2 overflow-x-auto rounded border p-3 font-mono text-[11px] leading-relaxed">
                {spec.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
};
