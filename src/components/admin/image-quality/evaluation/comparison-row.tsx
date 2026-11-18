import { useTranslation } from "react-i18next";

import { DeltaText } from "@/components/admin/image-quality/evaluation/delta-text";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatImageEvalCount,
  formatImageEvalPValue,
  formatImageEvalValue,
  isImageEvalSignificant,
} from "@/helpers/image-quality-format";
import type { ImageEvalMetricDefinition, ImageEvalMetricResult } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

export const METRIC_KEYS: Record<ImageEvalMetricDefinition["field"], { label: string; hint: string }> = {
  textOk: {
    label: "admin.imageQuality.evaluation.metrics.textOk.label",
    hint: "admin.imageQuality.evaluation.metrics.textOk.hint",
  },
  textOkOcr: {
    label: "admin.imageQuality.evaluation.metrics.textOkOcr.label",
    hint: "admin.imageQuality.evaluation.metrics.textOkOcr.hint",
  },
  cer: {
    label: "admin.imageQuality.evaluation.metrics.cer.label",
    hint: "admin.imageQuality.evaluation.metrics.cer.hint",
  },
  textClear: {
    label: "admin.imageQuality.evaluation.metrics.textClear.label",
    hint: "admin.imageQuality.evaluation.metrics.textClear.hint",
  },
  layoutOk: {
    label: "admin.imageQuality.evaluation.metrics.layoutOk.label",
    hint: "admin.imageQuality.evaluation.metrics.layoutOk.hint",
  },
  notCut: {
    label: "admin.imageQuality.evaluation.metrics.notCut.label",
    hint: "admin.imageQuality.evaluation.metrics.notCut.hint",
  },
  centred: {
    label: "admin.imageQuality.evaluation.metrics.centred.label",
    hint: "admin.imageQuality.evaluation.metrics.centred.hint",
  },
  sizeOk: {
    label: "admin.imageQuality.evaluation.metrics.sizeOk.label",
    hint: "admin.imageQuality.evaluation.metrics.sizeOk.hint",
  },
  clipOverall: {
    label: "admin.imageQuality.evaluation.metrics.clipOverall.label",
    hint: "admin.imageQuality.evaluation.metrics.clipOverall.hint",
  },
  clipElements: {
    label: "admin.imageQuality.evaluation.metrics.clipElements.label",
    hint: "admin.imageQuality.evaluation.metrics.clipElements.hint",
  },
  musiq: {
    label: "admin.imageQuality.evaluation.metrics.musiq.label",
    hint: "admin.imageQuality.evaluation.metrics.musiq.hint",
  },
  topiqNr: {
    label: "admin.imageQuality.evaluation.metrics.topiqNr.label",
    hint: "admin.imageQuality.evaluation.metrics.topiqNr.hint",
  },
  clipIqaPlus: {
    label: "admin.imageQuality.evaluation.metrics.clipIqaPlus.label",
    hint: "admin.imageQuality.evaluation.metrics.clipIqaPlus.hint",
  },
  liqe: {
    label: "admin.imageQuality.evaluation.metrics.liqe.label",
    hint: "admin.imageQuality.evaluation.metrics.liqe.hint",
  },
  laionAes: {
    label: "admin.imageQuality.evaluation.metrics.laionAes.label",
    hint: "admin.imageQuality.evaluation.metrics.laionAes.hint",
  },
};

type ComparisonRowProps = {
  result: ImageEvalMetricResult;
};

export const ComparisonRow = ({ result }: ComparisonRowProps) => {
  const { t } = useTranslation("common");
  const beforeCount = formatImageEvalCount(result.before);
  const afterCount = formatImageEvalCount(result.after);
  const isSignificant = isImageEvalSignificant(result.pValue);
  const metricKeys = METRIC_KEYS[result.definition.field];

  return (
    <TableRow>
      <TableCell className="py-3 pl-5 whitespace-normal sm:pl-6">
        <span className="text-ink-900 block text-sm font-medium">{t(metricKeys.label)}</span>
        <span className="text-ink-500 mt-0.5 block max-w-lg text-xs leading-snug">
          {t(metricKeys.hint)}
        </span>
      </TableCell>
      <TableCell className="text-ink-500 text-right font-mono text-sm tabular-nums">
        {formatImageEvalValue(result, result.before)}
        {beforeCount ? <span className="text-ink-400 block text-[11px]">{beforeCount}</span> : null}
      </TableCell>
      <TableCell className="text-ink-900 bg-sky-50/50 text-right font-mono text-sm font-semibold tabular-nums dark:bg-sky-500/10">
        {formatImageEvalValue(result, result.after)}
        {afterCount ? (
          <span className="text-ink-500 block text-[11px] font-normal">{afterCount}</span>
        ) : null}
      </TableCell>
      <TableCell className="text-[13px]">
        <DeltaText result={result} />
      </TableCell>
      <TableCell
        className={cn(
          "text-ink-500 pr-5 font-mono text-xs whitespace-nowrap sm:pr-6",
          isSignificant && "text-ink-900 font-bold"
        )}
      >
        {formatImageEvalPValue(result.pValue)}
      </TableCell>
    </TableRow>
  );
};
