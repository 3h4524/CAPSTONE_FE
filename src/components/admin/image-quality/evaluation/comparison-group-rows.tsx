import { useTranslation } from "react-i18next";

import { ComparisonRow } from "@/components/admin/image-quality/evaluation/comparison-row";
import { TableCell, TableRow } from "@/components/ui/table";
import type { ImageEvalMetricGroup, ImageEvalMetricGroupRows } from "@/types/admin-image-quality";

type ComparisonGroupRowsProps = {
  group: ImageEvalMetricGroupRows;
};

export const GROUP_KEYS: Record<ImageEvalMetricGroup, string> = {
  text: "admin.imageQuality.evaluation.groups.text",
  layout: "admin.imageQuality.evaluation.groups.layout",
  adherence: "admin.imageQuality.evaluation.groups.adherence",
  quality: "admin.imageQuality.evaluation.groups.quality",
};

export const ComparisonGroupRows = ({ group }: ComparisonGroupRowsProps) => {
  const { t } = useTranslation("common");

  return (
    <>
      <TableRow className="bg-ink-50 hover:bg-ink-50">
        <TableCell
          colSpan={5}
          className="text-ink-700 py-2 pl-5 text-xs font-bold tracking-wide uppercase sm:pl-6"
        >
          {t(GROUP_KEYS[group.group])}
        </TableCell>
      </TableRow>
      {group.metrics.map((result) => (
        <ComparisonRow key={result.definition.field} result={result} />
      ))}
    </>
  );
};
