import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ComparisonGroupRows } from "@/components/admin/image-quality/evaluation/comparison-group-rows";
import { ComparisonPhoneList } from "@/components/admin/image-quality/evaluation/comparison-phone-list";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { groupImageEvalMetrics } from "@/helpers/image-eval-comparison";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ImageEvalComparison } from "@/types/admin-image-quality";

type ComparisonTableProps = {
  comparison: ImageEvalComparison;
};

export const ComparisonTable = ({ comparison }: ComparisonTableProps) => {
  const { t } = useTranslation("common");
  const groups = useMemo(() => groupImageEvalMetrics(comparison.metrics), [comparison.metrics]);
  const isPhone = useIsPhone();

  return (
    <SectionCard
      title={t("admin.imageQuality.evaluation.comparisonTitle")}
      description={t("admin.imageQuality.evaluation.comparisonDescription")}
    >
      {isPhone ? (
        <ComparisonPhoneList
          groups={groups}
          beforeImageCount={comparison.beforeImages.length}
          afterImageCount={comparison.afterImages.length}
        />
      ) : (
      <Table className="min-w-190">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-ink-600 w-[44%] pl-5 text-xs font-semibold sm:pl-6">
              {t("admin.imageQuality.evaluation.metricColumn")}
            </TableHead>
            <TableHead className="text-ink-600 text-right text-xs font-semibold">
              {t("admin.imageQuality.shared.before")}
              <span className="text-ink-400 block text-[11px] font-normal">
                {t("admin.imageQuality.shared.imagesCount", { count: comparison.beforeImages.length })}
              </span>
            </TableHead>
            <TableHead className="bg-sky-50/70 text-right text-xs font-semibold text-sky-900 dark:bg-sky-500/10 dark:text-sky-300">
              {t("admin.imageQuality.shared.after")}
              <span className="block text-[11px] font-normal text-sky-800/70 dark:text-sky-300">
                {t("admin.imageQuality.shared.imagesCount", { count: comparison.afterImages.length })}
              </span>
            </TableHead>
            <TableHead className="text-ink-600 text-xs font-semibold">{t("admin.imageQuality.evaluation.changeColumn")}</TableHead>
            <TableHead className="text-ink-600 pr-5 text-xs font-semibold sm:pr-6">{t("admin.imageQuality.evaluation.testColumn")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <ComparisonGroupRows key={group.group} group={group} />
          ))}
        </TableBody>
      </Table>
      )}
    </SectionCard>
  );
};
