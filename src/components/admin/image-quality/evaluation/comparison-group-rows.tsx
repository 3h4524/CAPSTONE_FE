import { ComparisonRow } from "@/components/admin/image-quality/evaluation/comparison-row";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ImageEvalMetricGroupRows } from "@/types/admin-image-quality";

type ComparisonGroupRowsProps = {
  group: ImageEvalMetricGroupRows;
};

export const ComparisonGroupRows = ({ group }: ComparisonGroupRowsProps) => (
  <>
    <TableRow className="bg-ink-50 hover:bg-ink-50">
      <TableCell
        colSpan={5}
        className="text-ink-700 py-2 pl-5 text-xs font-bold tracking-wide uppercase sm:pl-6"
      >
        {group.label}
      </TableCell>
    </TableRow>
    {group.metrics.map((result) => (
      <ComparisonRow key={result.definition.field} result={result} />
    ))}
  </>
);
