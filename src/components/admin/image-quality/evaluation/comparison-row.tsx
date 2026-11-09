import { DeltaText } from "@/components/admin/image-quality/evaluation/delta-text";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatImageEvalCount,
  formatImageEvalPValue,
  formatImageEvalValue,
  isImageEvalSignificant,
} from "@/helpers/image-quality-format";
import type { ImageEvalMetricResult } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type ComparisonRowProps = {
  result: ImageEvalMetricResult;
};

export const ComparisonRow = ({ result }: ComparisonRowProps) => {
  const beforeCount = formatImageEvalCount(result.before);
  const afterCount = formatImageEvalCount(result.after);
  const isSignificant = isImageEvalSignificant(result.pValue);

  return (
    <TableRow>
      <TableCell className="py-3 pl-5 whitespace-normal sm:pl-6">
        <span className="text-ink-900 block text-sm font-medium">{result.definition.label}</span>
        <span className="text-ink-500 mt-0.5 block max-w-lg text-xs leading-snug">
          {result.definition.hint}
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
