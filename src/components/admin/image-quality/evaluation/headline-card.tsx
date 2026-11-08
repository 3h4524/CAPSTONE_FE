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
    <article className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      <p className="text-[13px] font-semibold text-slate-600">{result.definition.label}</p>
      <p className="font-display flex items-center gap-2.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        <span className="text-slate-400">{formatImageEvalValue(result, result.before)}</span>
        <ArrowRight className="size-5 text-slate-400" aria-label="to" />
        <span>{formatImageEvalValue(result, result.after)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-500">
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
