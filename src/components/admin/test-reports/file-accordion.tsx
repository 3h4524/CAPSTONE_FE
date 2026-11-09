"use client";

import { useState } from "react";
import { ChevronDown, FileCode2 } from "lucide-react";

import { TestReportSpecRow } from "@/components/admin/test-reports/spec-row";
import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
import type { TestReportFile } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportFileAccordionProps = {
  files: TestReportFile[];
};

export const TestReportFileAccordion = ({ files }: TestReportFileAccordionProps) => {
  // Only the files that lost a test to a new problem open by default; the ones that only
  // hold the known gaps stay closed.
  const [openFiles, setOpenFiles] = useState<string[]>(() =>
    files
      .filter((file) =>
        file.specs.some(
          (spec) => spec.status === "failed" && !spec.isKnownIssue
        )
      )
      .map((file) => `${file.project}:${file.file}`)
  );

  const toggle = (key: string) =>
    setOpenFiles((open) =>
      open.includes(key) ? open.filter((item) => item !== key) : [...open, key]
    );

  return (
    <div className="divide-ink-100 divide-y">
      {files.map((file) => {
        const key = `${file.project}:${file.file}`;
        const isOpen = openFiles.includes(key);

        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              className="hover:bg-ink-50/70 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
              aria-expanded={isOpen}
            >
              <ChevronDown
                className={cn(
                  "text-ink-400 size-4 shrink-0 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
              <FileCode2 className="text-ink-400 size-4 shrink-0" />
              <span className="text-ink-700 min-w-0 flex-1 truncate font-mono text-xs">
                {file.file}
              </span>
              <span className="bg-ink-100 text-ink-500 hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                {file.project}
              </span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                {file.passed > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">{file.passed} ok</span>
                )}
                {file.failed > 0 && (
                  <span className="text-rose-600 dark:text-rose-400">
                    {file.failed -
                      file.specs.filter(
                        (spec) => spec.status === "failed" && spec.isKnownIssue
                      ).length}{" "}
                    failed
                  </span>
                )}
                {file.flaky > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">{file.flaky} flaky</span>
                )}
                {file.skipped > 0 && (
                  <span className="text-ink-400">{file.skipped} skipped</span>
                )}
              </span>
              <TestReportStatusBadge status={file.status} className="shrink-0" />
            </button>

            {isOpen && (
              <ul className="border-ink-100 bg-ink-50/40 border-t">
                {file.specs.map((spec) => (
                  <TestReportSpecRow
                    key={`${file.file}:${spec.title}`}
                    spec={spec}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};
