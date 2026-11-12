"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";

import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
import type { TestReportFile, TestReportSpec } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportFailureGroupsProps = {
  files: TestReportFile[];
};

type FailureGroup = {
  signature: string;
  specs: Array<TestReportSpec & { file: string }>;
  knownIssues: number;
};

const signatureOf = (spec: TestReportSpec) => {
  const message = spec.errorMessage?.split("\n").find((line) => line.trim());
  if (!message) return "The test failed without a message";
  return message.trim().slice(0, 140);
};

export const TestReportFailureGroups = ({ files }: TestReportFailureGroupsProps) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, FailureGroup>();
    files.forEach((file) => {
      file.specs
        .filter((spec) => spec.status === "failed")
        .forEach((spec) => {
          const signature = signatureOf(spec);
          const group = map.get(signature) ?? {
            signature,
            specs: [],
            knownIssues: 0,
          };
          group.specs.push({ ...spec, file: file.file });
          if (spec.isKnownIssue) group.knownIssues += 1;
          map.set(signature, group);
        });
    });
    return [...map.values()].sort(
      (left, right) => right.specs.length - left.specs.length
    );
  }, [files]);

  if (groups.length === 0) {
    return (
      <section className="border-ink-200 bg-card rounded-xl border p-5">
        <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
          Why the tests failed
        </h3>
        <p className="text-ink-400 mt-2 text-[11px]">
          No test failed in this run.
        </p>
      </section>
    );
  }

  return (
    <section className="border-ink-200 bg-card rounded-xl border">
      <div className="border-ink-100 border-b px-5 py-4">
        <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
          Why the tests failed
        </h3>
        <p className="text-ink-400 mt-0.5 text-[10px]">
          {groups.length} different reasons. Open one to see the tests that share it.
        </p>
      </div>

      <div className="divide-ink-100 divide-y">
        {groups.map((group) => {
          const key = group.signature;
          const isOpen = openGroup === key;
          const allKnown = group.knownIssues === group.specs.length;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : key)}
                className="hover:bg-ink-50/70 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
                aria-expanded={isOpen}
              >
                <ChevronDown
                  className={cn(
                    "text-ink-400 size-4 shrink-0 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <Layers className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink-700 block truncate font-mono text-[11px]">
                    {group.signature}
                  </span>
                </span>
                {allKnown && (
                  <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    known gap
                  </span>
                )}
                <span className="text-ink-500 w-16 shrink-0 text-right text-[11px] font-bold">
                  {group.specs.length} test{group.specs.length === 1 ? "" : "s"}
                </span>
              </button>

              {isOpen && (
                <ul className="border-ink-100 bg-ink-50/40 border-t">
                  {group.specs.map((spec) => (
                    <li
                      key={`${spec.file}:${spec.title}`}
                      className="border-ink-100 flex flex-wrap items-center gap-2 border-b px-5 py-2 last:border-b-0"
                    >
                      <TestReportStatusBadge status={spec.status} className="shrink-0" />
                      <span className="text-ink-700 min-w-0 flex-1 truncate text-[11px]">
                        {spec.title}
                      </span>
                      {spec.isKnownIssue && (
                        <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                          known gap
                        </span>
                      )}
                      <span className="text-ink-400 shrink-0 font-mono text-[10px]">
                        {spec.file}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
