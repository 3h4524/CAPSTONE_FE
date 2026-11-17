import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatImageEvalDelta, getImageEvalDeltaTone } from "@/helpers/image-quality-format";
import type { ImageEvalMetricResult } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type DeltaTextProps = {
  result: ImageEvalMetricResult;
};

const TONE_KEYS: Record<ReturnType<typeof getImageEvalDeltaTone>, string> = {
  better: "admin.imageQuality.evaluation.delta.better",
  worse: "admin.imageQuality.evaluation.delta.worse",
  same: "admin.imageQuality.evaluation.delta.same",
  none: "",
};

export const DeltaText = ({ result }: DeltaTextProps) => {
  const { t } = useTranslation("common");
  const tone = getImageEvalDeltaTone(result);
  const isRising = (result.delta ?? 0) > 0;
  const Icon = tone === "same" || tone === "none" ? Minus : isRising ? ArrowUpRight : ArrowDownRight;
  const toneKey = TONE_KEYS[tone];

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold whitespace-nowrap",
        tone === "better" && "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
        tone === "worse" && "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300",
        (tone === "same" || tone === "none") && "text-ink-500 font-normal"
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {formatImageEvalDelta(result)}
      {toneKey ? <span className="sr-only">({t(toneKey)})</span> : null}
    </span>
  );
};
