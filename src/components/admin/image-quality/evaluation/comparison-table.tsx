import { useMemo } from "react";

import { ComparisonGroupRows } from "@/components/admin/image-quality/evaluation/comparison-group-rows";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { groupImageEvalMetrics } from "@/helpers/image-eval-comparison";
import type { ImageEvalComparison } from "@/types/admin-image-quality";

type ComparisonTableProps = {
  comparison: ImageEvalComparison;
};

export const ComparisonTable = ({ comparison }: ComparisonTableProps) => {
  const groups = useMemo(() => groupImageEvalMetrics(comparison.metrics), [comparison.metrics]);

  return (
    <SectionCard
      title="Before and after"
      description="Every metric on the same images. Rates are tested with a two-sided Fisher exact test on image counts; a p-value under 0.05 is in bold. Means are not tested."
    >
      <Table className="min-w-190">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[44%] pl-5 text-xs font-semibold text-ink-600 sm:pl-6">
              Metric
            </TableHead>
            <TableHead className="text-right text-xs font-semibold text-ink-600">
              Before
              <span className="block text-[11px] font-normal text-ink-400">
                {comparison.beforeImages.length} images
              </span>
            </TableHead>
            <TableHead className="bg-sky-50/70 dark:bg-sky-500/10 text-right text-xs font-semibold text-sky-900 dark:text-sky-300">
              After
              <span className="block text-[11px] font-normal text-sky-800/70 dark:text-sky-300">
                {comparison.afterImages.length} images
              </span>
            </TableHead>
            <TableHead className="text-xs font-semibold text-ink-600">Change</TableHead>
            <TableHead className="pr-5 text-xs font-semibold text-ink-600 sm:pr-6">Test</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <ComparisonGroupRows key={group.group} group={group} />
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
};
