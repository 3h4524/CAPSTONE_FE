import { ArrowRight } from "lucide-react";

import { DeltaText } from "@/components/admin/image-quality/evaluation/delta-text";
import {
  formatImageEvalCount,
  formatImageEvalPValue,
  formatImageEvalValue,
} from "@/helpers/image-quality-format";
import type { ImageEvalMetricResult } from "@/types/admin-image-quality";

type HeadlineCardProps = {
  result: ImageEvalMetricResult;
};

export const HeadlineCard = ({ result }: HeadlineCardProps) => {
  const beforeCount = formatImageEvalCount(result.before);
  const afterCount = formatImageEvalCount(result.after);
  const pValue = formatImageEvalPValue(result.pValue);

  return (
    <article className="border-ink-200 bg-card relative flex flex-col gap-3 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:gap-1.5 max-md:p-3">
      <p className="text-ink-600 text-[13px] font-semibold">{result.definition.label}</p>
      <p className="font-display text-ink-900 flex items-center gap-2.5 text-3xl font-bold tracking-tight tabular-nums max-md:flex-wrap max-md:gap-1 max-md:text-lg">
        <span className="text-ink-400">{formatImageEvalValue(result, result.before)}</span>
        <ArrowRight className="text-ink-400 size-5 max-md:size-3.5" aria-label="to" />
        <span>{formatImageEvalValue(result, result.after)}</span>
      </p>
      <div className="text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        <DeltaText result={result} />
        {beforeCount && afterCount ? (
          <span className="font-mono text-xs">
            {beforeCount} → {afterCount}
          </span>
        ) : null}
        {pValue ? <span className="font-mono text-xs">{pValue}</span> : null}
      </div>
    </article>
  );
};
