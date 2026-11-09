import { ArrowRight } from "lucide-react";

import { DeltaText } from "@/components/admin/image-quality/evaluation/delta-text";
import {
  formatImageEvalCount,
  formatImageEvalPValue,
  formatImageEvalValue,
  isImageEvalSignificant,
} from "@/helpers/image-quality-format";
import type { ImageEvalMetricGroupRows, ImageEvalMetricResult } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type ComparisonPhoneListProps = {
  groups: ImageEvalMetricGroupRows[];
  beforeImageCount: number;
  afterImageCount: number;
};

const ComparisonPhoneRow = ({ result }: { result: ImageEvalMetricResult }) => {
  const beforeCount = formatImageEvalCount(result.before);
  const afterCount = formatImageEvalCount(result.after);
  const pValue = formatImageEvalPValue(result.pValue);

  return (
    <li className="space-y-1.5 px-4 py-3">
      <div>
        <p className="text-ink-900 text-sm font-medium">{result.definition.label}</p>
        <p className="text-ink-500 mt-0.5 text-[11px] leading-snug">{result.definition.hint}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-1.5 font-mono text-sm tabular-nums">
          <span className="text-ink-500">{formatImageEvalValue(result, result.before)}</span>
          <ArrowRight className="text-ink-400 size-3.5" aria-label="to" />
          <span className="text-ink-900 font-semibold">{formatImageEvalValue(result, result.after)}</span>
        </p>
        <span className="text-[13px]">
          <DeltaText result={result} />
        </span>
      </div>
      {(beforeCount || afterCount || pValue) && (
        <p className="text-ink-400 flex items-center justify-between gap-3 font-mono text-[11px]">
          <span>{beforeCount || afterCount ? `${beforeCount ?? "–"} → ${afterCount ?? "–"}` : ""}</span>
          <span className={cn(isImageEvalSignificant(result.pValue) && "text-ink-900 font-bold")}>{pValue}</span>
        </p>
      )}
    </li>
  );
};

/** The before and after table on a phone: every cell of a row, stacked, so it does not scroll sideways. */
export const ComparisonPhoneList = ({ groups, beforeImageCount, afterImageCount }: ComparisonPhoneListProps) => (
  <div>
    <p className="text-ink-500 flex items-center justify-between gap-3 px-4 py-2 text-[11px]">
      <span>Before · {beforeImageCount} images</span>
      <span className="font-semibold text-sky-900 dark:text-sky-300">After · {afterImageCount} images</span>
    </p>
    {groups.map((group) => (
      <section key={group.group}>
        <h4 className="bg-ink-50 text-ink-700 px-4 py-2 text-xs font-bold tracking-wide uppercase">{group.label}</h4>
        <ul className="divide-ink-100 divide-y">
          {group.metrics.map((result) => (
            <ComparisonPhoneRow key={result.definition.field} result={result} />
          ))}
        </ul>
      </section>
    ))}
  </div>
);
