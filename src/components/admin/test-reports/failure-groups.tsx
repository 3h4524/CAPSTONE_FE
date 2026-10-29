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
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
          Why the tests failed
        </h3>
        <p className="mt-2 text-[11px] text-slate-400">
          No test failed in this run.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
          Why the tests failed
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {groups.length} different reasons. Open one to see the tests that share it.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group) => {
          const key = group.signature;
          const isOpen = openGroup === key;
          const allKnown = group.knownIssues === group.specs.length;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : key)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/70"
                aria-expanded={isOpen}
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-slate-400 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-500">
                  <Layers className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] text-slate-700">
                    {group.signature}
                  </span>
                </span>
                {allKnown && (
                  <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase">
                    known gap
                  </span>
                )}
                <span className="w-16 shrink-0 text-right text-[11px] font-bold text-slate-500">
                  {group.specs.length} test{group.specs.length === 1 ? "" : "s"}
                </span>
              </button>

              {isOpen && (
                <ul className="border-t border-slate-100 bg-slate-50/40">
                  {group.specs.map((spec) => (
                    <li
                      key={`${spec.file}:${spec.title}`}
                      className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2 last:border-b-0"
                    >
                      <TestReportStatusBadge status={spec.status} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">
                        {spec.title}
                      </span>
                      {spec.isKnownIssue && (
                        <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-700 uppercase">
                          known gap
                        </span>
                      )}
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">
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
