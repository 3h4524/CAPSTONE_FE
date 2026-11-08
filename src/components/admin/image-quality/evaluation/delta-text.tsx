import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatImageEvalDelta, getImageEvalDeltaTone } from "@/helpers/image-quality-format";
import type { ImageEvalMetricResult } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type DeltaTextProps = {
  result: ImageEvalMetricResult;
};

const TONE_TEXT = {
  better: "better",
  worse: "worse",
  same: "unchanged",
  none: "",
} as const;

export const DeltaText = ({ result }: DeltaTextProps) => {
  const tone = getImageEvalDeltaTone(result);
  const isRising = (result.delta ?? 0) > 0;
  const Icon = tone === "same" || tone === "none" ? Minus : isRising ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold whitespace-nowrap",
        tone === "better" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        tone === "worse" && "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
        (tone === "same" || tone === "none") && "font-normal text-ink-500"
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {formatImageEvalDelta(result)}
      {TONE_TEXT[tone] ? <span className="sr-only">({TONE_TEXT[tone]})</span> : null}
    </span>
  );
};
