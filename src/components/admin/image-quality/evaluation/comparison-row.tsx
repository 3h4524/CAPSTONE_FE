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
        <span className="block text-sm font-medium text-slate-900">{result.definition.label}</span>
        <span className="mt-0.5 block max-w-lg text-xs leading-snug text-slate-500">
          {result.definition.hint}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-slate-500 tabular-nums">
        {formatImageEvalValue(result, result.before)}
        {beforeCount ? <span className="block text-[11px] text-slate-400">{beforeCount}</span> : null}
      </TableCell>
      <TableCell className="bg-sky-50/50 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
        {formatImageEvalValue(result, result.after)}
        {afterCount ? (
          <span className="block text-[11px] font-normal text-slate-500">{afterCount}</span>
        ) : null}
      </TableCell>
      <TableCell className="text-[13px]">
        <DeltaText result={result} />
      </TableCell>
      <TableCell
        className={cn(
          "pr-5 font-mono text-xs whitespace-nowrap text-slate-500 sm:pr-6",
          isSignificant && "font-bold text-slate-900"
        )}
      >
        {formatImageEvalPValue(result.pValue)}
      </TableCell>
    </TableRow>
  );
};
