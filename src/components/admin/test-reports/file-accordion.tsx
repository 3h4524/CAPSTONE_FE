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
    <div className="divide-y divide-slate-100">
      {files.map((file) => {
        const key = `${file.project}:${file.file}`;
        const isOpen = openFiles.includes(key);

        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/70"
              aria-expanded={isOpen}
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-slate-400 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
              <FileCode2 className="size-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                {file.file}
              </span>
              <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
                {file.project}
              </span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                {file.passed > 0 && (
                  <span className="text-emerald-600">{file.passed} ok</span>
                )}
                {file.failed > 0 && (
                  <span className="text-rose-600">
                    {file.failed -
                      file.specs.filter(
                        (spec) => spec.status === "failed" && spec.isKnownIssue
                      ).length}{" "}
                    failed
                  </span>
                )}
                {file.flaky > 0 && (
                  <span className="text-amber-600">{file.flaky} flaky</span>
                )}
                {file.skipped > 0 && (
                  <span className="text-slate-400">{file.skipped} skipped</span>
                )}
              </span>
              <TestReportStatusBadge status={file.status} className="shrink-0" />
            </button>

            {isOpen && (
              <ul className="border-t border-slate-100 bg-slate-50/40">
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
