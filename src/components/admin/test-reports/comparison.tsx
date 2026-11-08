import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { TestReportDetail } from "@/types/admin-test-reports";

type TestReportComparisonProps = {
  current: TestReportDetail;
  previous?: TestReportDetail;
};

const failedTitles = (detail: TestReportDetail) =>
  new Set(
    detail.files.flatMap((file) =>
      file.specs.filter((spec) => spec.status === "failed").map((spec) => spec.title)
    )
  );

export const TestReportComparison = ({
  current,
  previous,
}: TestReportComparisonProps) => {
  if (!previous) {
    return (
      <section className="rounded-xl border border-ink-200 bg-card p-5">
        <h3 className="text-xs font-bold tracking-wide text-ink-800 uppercase">
          Compared with the run before
        </h3>
        <p className="mt-2 text-[11px] text-ink-400">
          This is the first run kept on this machine, so there is nothing to compare it with yet.
        </p>
      </section>
    );
  }

  const currentFailed = failedTitles(current);
  const previousFailed = failedTitles(previous);

  const newFailures = [...currentFailed].filter((title) => !previousFailed.has(title));
  const fixed = [...previousFailed].filter((title) => !currentFailed.has(title));
  const stillFailing = [...currentFailed].filter((title) => previousFailed.has(title));

  const cards = [
    {
      label: "New failures",
      count: newFailures.length,
      tone: newFailures.length > 0 ? "rose" : "slate",
      icon: ArrowUpRight,
      titles: newFailures,
    },
    {
      label: "Fixed since last run",
      count: fixed.length,
      tone: fixed.length > 0 ? "emerald" : "slate",
      icon: ArrowDownRight,
      titles: fixed,
    },
    {
      label: "Still failing",
      count: stillFailing.length,
      tone: stillFailing.length > 0 ? "amber" : "slate",
      icon: Minus,
      titles: stillFailing,
    },
  ];

  return (
    <section className="rounded-xl border border-ink-200 bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-bold tracking-wide text-ink-800 uppercase">
          Compared with the run before
        </h3>
        <span className="font-mono text-[10px] text-ink-400">
          {previous.run.runId}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map(({ label, count, tone, icon: Icon, titles }) => (
          <div
            key={label}
            className={`rounded-lg border p-3.5 ${
              tone === "rose"
                ? "border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10"
                : tone === "emerald"
                  ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10"
                  : tone === "amber"
                    ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10"
                    : "border-ink-200 bg-ink-50/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wide text-ink-500 uppercase">
                {label}
              </span>
              <Icon
                className={`size-3.5 ${
                  tone === "rose"
                    ? "text-rose-500"
                    : tone === "emerald"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : tone === "amber"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-ink-400"
                }`}
              />
            </div>
            <p className="font-display mt-1.5 text-2xl font-bold text-ink-900">{count}</p>
            {titles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {titles.slice(0, 3).map((title) => (
                  <li
                    key={title}
                    className="truncate text-[10px] text-ink-500"
                    title={title}
                  >
                    {title}
                  </li>
                ))}
                {titles.length > 3 && (
                  <li className="text-[10px] text-ink-400">
                    +{titles.length - 3} more
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
